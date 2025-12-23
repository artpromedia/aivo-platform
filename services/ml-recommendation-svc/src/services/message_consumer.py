"""
Message Consumer - RabbitMQ event consumer for real-time updates.
"""

import json
from typing import Any

import aio_pika
import structlog
from aio_pika import IncomingMessage
from aio_pika.abc import AbstractChannel, AbstractConnection, AbstractQueue

from src.services.recommendation_engine import RecommendationEngine

logger = structlog.get_logger()


class MessageConsumer:
    """
    RabbitMQ consumer for learning events.
    
    Listens for events like:
    - practice_completed: Update learner features
    - skill_mastery_changed: Refresh recommendations
    - content_published: Update item features
    """

    def __init__(
        self,
        rabbitmq_url: str,
        exchange: str,
        queue: str,
        engine: RecommendationEngine,
    ) -> None:
        self.rabbitmq_url = rabbitmq_url
        self.exchange_name = exchange
        self.queue_name = queue
        self.engine = engine
        
        self.connection: AbstractConnection | None = None
        self.channel: AbstractChannel | None = None
        self.queue: AbstractQueue | None = None

    async def start(self) -> None:
        """Start consuming messages."""
        try:
            self.connection = await aio_pika.connect_robust(self.rabbitmq_url)
            self.channel = await self.connection.channel()
            
            # Declare exchange
            exchange = await self.channel.declare_exchange(
                self.exchange_name,
                aio_pika.ExchangeType.TOPIC,
                durable=True,
            )
            
            # Declare queue
            self.queue = await self.channel.declare_queue(
                self.queue_name,
                durable=True,
            )
            
            # Bind to relevant routing keys
            routing_keys = [
                "learner.practice.completed",
                "learner.skill.updated",
                "content.published",
                "content.updated",
                "session.ended",
            ]
            
            for key in routing_keys:
                await self.queue.bind(exchange, key)
            
            # Start consuming
            await self.queue.consume(self._handle_message)
            
            logger.info(
                "Message consumer started",
                queue=self.queue_name,
                routing_keys=routing_keys,
            )
            
        except Exception as e:
            logger.error("Failed to start message consumer", error=str(e))
            # Don't fail startup - service can work without events
            pass

    async def stop(self) -> None:
        """Stop consuming messages."""
        if self.connection:
            await self.connection.close()
            logger.info("Message consumer stopped")

    async def _handle_message(self, message: IncomingMessage) -> None:
        """Handle incoming message."""
        async with message.process():
            try:
                routing_key = message.routing_key
                body = json.loads(message.body.decode())
                
                logger.debug(
                    "Received message",
                    routing_key=routing_key,
                    body_preview=str(body)[:100],
                )
                
                await self._process_event(routing_key, body)
                
            except json.JSONDecodeError as e:
                logger.error("Invalid JSON in message", error=str(e))
            except Exception as e:
                logger.error("Error processing message", error=str(e))

    async def _process_event(
        self, routing_key: str | None, event: dict[str, Any]
    ) -> None:
        """Process an event based on its type."""
        if not routing_key:
            return
            
        handlers = {
            "learner.practice.completed": self._handle_practice_completed,
            "learner.skill.updated": self._handle_skill_updated,
            "content.published": self._handle_content_published,
            "content.updated": self._handle_content_updated,
            "session.ended": self._handle_session_ended,
        }
        
        handler = handlers.get(routing_key)
        if handler:
            await handler(event)

    async def _handle_practice_completed(self, event: dict[str, Any]) -> None:
        """Handle practice completion event."""
        learner_id = event.get("learnerId")
        skill_id = event.get("skillId")
        is_correct = event.get("isCorrect", False)
        
        if not learner_id or not skill_id:
            return
        
        # Update learner features in feature store
        features = await self.engine.feature_store.get_learner_features(learner_id)
        if features is None:
            features = {}
        
        # Update practice count and accuracy
        features["total_practices"] = features.get("total_practices", 0) + 1
        features["correct_count"] = features.get("correct_count", 0) + (1 if is_correct else 0)
        features["accuracy"] = features["correct_count"] / features["total_practices"]
        
        await self.engine.feature_store.set_learner_features(learner_id, features)
        
        logger.info(
            "Updated learner features after practice",
            learner_id=learner_id,
            skill_id=skill_id,
        )

    async def _handle_skill_updated(self, event: dict[str, Any]) -> None:
        """Handle skill mastery update event."""
        learner_id = event.get("learnerId")
        skill_id = event.get("skillId")
        mastery = event.get("masteryLevel", 0)
        
        if not learner_id:
            return
        
        # Update learner skill features
        features = await self.engine.feature_store.get_learner_features(learner_id)
        if features is None:
            features = {}
        
        skill_masteries = features.get("skill_masteries", {})
        skill_masteries[skill_id] = mastery
        features["skill_masteries"] = skill_masteries
        
        await self.engine.feature_store.set_learner_features(learner_id, features)

    async def _handle_content_published(self, event: dict[str, Any]) -> None:
        """Handle new content published event."""
        content_id = event.get("contentId")
        
        if not content_id:
            return
        
        # Store content features for recommendation
        features = {
            "id": content_id,
            "title": event.get("title", ""),
            "type": event.get("contentType", "activity"),
            "difficulty": event.get("difficulty", 0.5),
            "skills": event.get("skills", []),
            "domain": event.get("domain", ""),
            "published_at": event.get("publishedAt", ""),
        }
        
        await self.engine.feature_store.set_item_features(content_id, features)
        
        logger.info("Indexed new content", content_id=content_id)

    async def _handle_content_updated(self, event: dict[str, Any]) -> None:
        """Handle content update event."""
        await self._handle_content_published(event)

    async def _handle_session_ended(self, event: dict[str, Any]) -> None:
        """Handle session end event."""
        learner_id = event.get("learnerId")
        
        if not learner_id:
            return
        
        # Update session statistics
        features = await self.engine.feature_store.get_learner_features(learner_id)
        if features is None:
            features = {}
        
        features["total_sessions"] = features.get("total_sessions", 0) + 1
        features["last_session_duration"] = event.get("durationMinutes", 0)
        features["activities_completed"] = (
            features.get("activities_completed", 0) + 
            event.get("activitiesCompleted", 0)
        )
        
        await self.engine.feature_store.set_learner_features(learner_id, features)
