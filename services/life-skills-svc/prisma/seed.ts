/**
 * Life Skills Seed Data
 *
 * Initial seed data for life skills, task analyses, and safety scenarios.
 * Run with: npx prisma db seed
 */

import { PrismaClient } from '../generated/prisma-client/index.js';

const prisma = new PrismaClient();

// Sample tenant ID - replace with actual tenant in production
const TENANT_ID = 'a0000000-0000-0000-0000-000000000001';

async function main() {
  console.log('🌱 Seeding life skills data...');

  // =====================
  // PERSONAL HYGIENE SKILLS
  // =====================

  await prisma.lifeSkill.create({
    data: {
      tenantId: TENANT_ID,
      code: 'HYGIENE_BRUSH_TEETH',
      name: 'Brushing Teeth',
      description:
        'Learn how to brush your teeth properly to keep them healthy and clean. This skill covers the complete tooth brushing routine from start to finish.',
      category: 'PERSONAL_HYGIENE',
      difficultyLevel: 'FOUNDATIONAL',
      estimatedMinutes: 5,
      minAgeMonths: 36, // 3 years
      maxAgeMonths: 144, // 12 years
      isActive: true,
      keywords: ['teeth', 'brushing', 'hygiene', 'dental', 'toothbrush', 'toothpaste'],
      taskAnalysis: {
        create: {
          version: 1,
          totalSteps: 8,
          teachingTips:
            'Use a visual timer to help with the 2-minute brushing duration. Consider using a toothbrush with soft bristles and child-safe toothpaste.',
          materialsNeeded: [
            'Toothbrush',
            'Toothpaste',
            'Cup of water',
            'Mirror',
            'Timer (optional)',
          ],
          setupNotes:
            'Ensure the child can reach the sink comfortably. Use a step stool if needed. Supervise to prevent swallowing toothpaste.',
          reinforcementIdeas: [
            'Star on chart',
            'High five',
            'Verbal praise',
            'Small reward after a week of success',
          ],
          steps: {
            create: [
              {
                stepNumber: 1,
                instruction: 'Pick up your toothbrush and hold it in your hand.',
                detailedPrompt:
                  'Help the learner identify which toothbrush belongs to them (color/character). Guide them to pick it up with their dominant hand.',
                aiPromptTemplate:
                  'Guide the learner to find and pick up their toothbrush. Use encouraging language.',
                expectedSeconds: 10,
              },
              {
                stepNumber: 2,
                instruction: 'Squeeze a small amount of toothpaste onto the bristles.',
                detailedPrompt:
                  'Use the pea-sized amount visual. Some children may need a toothpaste pump dispenser for easier control.',
                aiPromptTemplate:
                  'Help the learner apply the right amount of toothpaste - about the size of a pea.',
                expectedSeconds: 15,
              },
              {
                stepNumber: 3,
                instruction: 'Hold your toothbrush under the water for just a second to wet it.',
                detailedPrompt:
                  'Some children prefer wetting before toothpaste - either order is fine. Quick dip under water is sufficient.',
                aiPromptTemplate:
                  'Guide the learner to quickly wet their toothbrush under running water.',
                expectedSeconds: 5,
              },
              {
                stepNumber: 4,
                instruction: 'Use small circles to brush the front of your teeth.',
                detailedPrompt:
                  'Model the circular motion. Use a mirror so the child can see. Brush for about 30 seconds on front teeth.',
                aiPromptTemplate:
                  'Encourage the learner to make small circles on their front teeth. Count to 30 together.',
                expectedSeconds: 30,
                isCritical: true,
              },
              {
                stepNumber: 5,
                instruction:
                  'Move to the teeth on the sides. Brush the outside, then the chewing part.',
                detailedPrompt:
                  'Encourage opening mouth wide. Count teeth together if helpful. Brush both top and bottom side teeth.',
                aiPromptTemplate:
                  'Guide brushing the side teeth - both top and bottom, outside and chewing surfaces.',
                expectedSeconds: 30,
                isCritical: true,
              },
              {
                stepNumber: 6,
                instruction: 'Open wide and brush the teeth all the way in the back.',
                detailedPrompt:
                  'This is often the most challenging area. Use a smaller brush head if needed. Reach all the way to the molars.',
                aiPromptTemplate:
                  'Help the learner reach the back teeth. Encourage opening wide and gentle brushing.',
                expectedSeconds: 30,
                isCritical: true,
              },
              {
                stepNumber: 7,
                instruction: 'Lean over the sink and spit out the toothpaste.',
                detailedPrompt:
                  'Model spitting if needed. Some children may need practice with this skill. Make sure they do not swallow.',
                aiPromptTemplate:
                  'Guide the learner to spit the toothpaste into the sink. Remind them not to swallow.',
                expectedSeconds: 10,
              },
              {
                stepNumber: 8,
                instruction: 'Rinse your mouth with water and put your toothbrush away.',
                detailedPrompt:
                  'Establish a consistent place for the toothbrush. Take a small sip of water, swish, and spit.',
                aiPromptTemplate:
                  'Help the learner rinse their mouth and put everything away. Celebrate completion!',
                expectedSeconds: 15,
              },
            ],
          },
        },
      },
    },
  });

  console.log('  ✓ Created: Brushing Teeth');

  // =====================
  // EATING & DRINKING SKILLS
  // =====================

  await prisma.lifeSkill.create({
    data: {
      tenantId: TENANT_ID,
      code: 'EATING_FORK_KNIFE',
      name: 'Using Fork and Knife',
      description:
        'Learn how to use a fork and knife properly to eat food. This skill helps you cut food and bring it to your mouth safely.',
      category: 'EATING_SKILLS',
      difficultyLevel: 'DEVELOPING',
      estimatedMinutes: 10,
      minAgeMonths: 48, // 4 years
      maxAgeMonths: 120, // 10 years
      isActive: true,
      keywords: ['fork', 'knife', 'cutlery', 'eating', 'cutting', 'mealtime'],
      taskAnalysis: {
        create: {
          version: 1,
          totalSteps: 6,
          teachingTips:
            'Start with soft foods that are easy to cut. Use child-safe cutlery with rounded edges. Practice with playdough first if needed.',
          materialsNeeded: ['Fork', 'Knife (child-safe)', 'Plate', 'Food item', 'Napkin'],
          setupNotes:
            'Ensure proper seating height. Non-slip mat under plate can help stability. Use child-safe cutlery.',
          reinforcementIdeas: [
            'Verbal praise',
            'Let child choose dessert',
            'Special meal together',
          ],
          steps: {
            create: [
              {
                stepNumber: 1,
                instruction:
                  'Pick up the fork with your non-dominant hand. Hold it pointing down at the food.',
                detailedPrompt:
                  'For young children, a fist grip is acceptable initially. The fork should point downward to poke and hold food.',
                aiPromptTemplate:
                  'Help the learner hold the fork correctly in their non-dominant hand.',
                expectedSeconds: 10,
              },
              {
                stepNumber: 2,
                instruction:
                  'Pick up the knife with your dominant hand. Put your pointer finger on top.',
                detailedPrompt:
                  'Finger on top provides control. Practice the grip before cutting. Make sure they hold the handle firmly.',
                aiPromptTemplate: 'Guide the learner to hold the knife safely with finger on top.',
                expectedSeconds: 10,
                isCritical: true,
              },
              {
                stepNumber: 3,
                instruction: 'Push the fork into the food to hold it steady.',
                detailedPrompt:
                  'Demonstrate the angle. Fork should be nearly vertical. The fork keeps the food from moving while cutting.',
                aiPromptTemplate: 'Show the learner how to poke and hold the food with the fork.',
                expectedSeconds: 5,
              },
              {
                stepNumber: 4,
                instruction: 'Use a sawing motion with the knife to cut the food.',
                detailedPrompt:
                  'Start with soft foods. Model the sawing motion slowly. Push down gently while moving back and forth.',
                aiPromptTemplate:
                  'Guide the sawing motion - back and forth while pressing gently down.',
                expectedSeconds: 20,
                isCritical: true,
              },
              {
                stepNumber: 5,
                instruction: 'Once the piece is cut, put the knife down on the edge of your plate.',
                detailedPrompt:
                  'Establish a consistent spot for the knife to rest. Knife should rest with cutting edge toward center of plate.',
                aiPromptTemplate:
                  'Remind the learner to put the knife down safely on the plate edge.',
                expectedSeconds: 5,
              },
              {
                stepNumber: 6,
                instruction: 'Use your fork to pick up the cut piece and bring it to your mouth.',
                detailedPrompt:
                  'Encourage small bites. Chew thoroughly before the next cut. Switch fork to dominant hand if preferred.',
                aiPromptTemplate:
                  'Guide bringing the food to mouth and chewing before the next bite. Celebrate success!',
                expectedSeconds: 15,
              },
            ],
          },
        },
      },
    },
  });

  console.log('  ✓ Created: Using Fork and Knife');

  // =====================
  // SAFETY SCENARIOS
  // =====================

  // Stranger Danger scenario
  await prisma.safetyScenario.create({
    data: {
      tenantId: TENANT_ID,
      code: 'SAFETY_STRANGER_CANDY',
      title: 'A Stranger Offers You Candy',
      description: 'Learn what to do when a stranger approaches you and offers something.',
      scenarioType: 'STRANGER_AWARENESS',
      sceneDescription:
        'You are walking home from school when a person you do not know stops their car next to you. They smile and say, "Hi there! I have some candy in my car. Would you like some? Come closer and I will give you a piece."',
      decisionPrompt: 'What should you do?',
      difficultyLevel: 'FOUNDATIONAL',
      minAgeMonths: 48,
      maxAgeMonths: 144,
      isActive: true,
      aiCoachingTemplate:
        'Explain why accepting things from strangers is dangerous. Emphasize the importance of staying away from unknown vehicles and finding a trusted adult.',
      choices: {
        create: [
          {
            choiceText: 'Say "No thank you" and walk away quickly to a safe place',
            outcome: 'SAFE',
            feedbackText: 'Excellent choice! You should never accept anything from strangers.',
            explanation:
              'Walking away quickly and going to a safe place is the right thing to do. Never accept anything from strangers or go near their car.',
            orderIndex: 0,
          },
          {
            choiceText: 'Go closer to see what kind of candy they have',
            outcome: 'UNSAFE',
            feedbackText: "This is not safe. You should never go near a stranger's car.",
            explanation:
              "Going near a stranger's car is very dangerous, even if they offer something nice. It could be a trick to get you close.",
            orderIndex: 1,
          },
          {
            choiceText: 'Take the candy because it seems rude to refuse',
            outcome: 'UNSAFE',
            feedbackText: 'Your safety is more important than being polite.',
            explanation:
              'It is okay to say no to strangers. Your safety comes first. They might be trying to trick you.',
            orderIndex: 2,
          },
          {
            choiceText: 'Ask them to come back when your parents are around',
            outcome: 'PARTIALLY_SAFE',
            feedbackText:
              'It is good that you want an adult present, but never make plans with strangers.',
            explanation:
              'Never talk to strangers or make plans with them. Just walk away quickly to a safe place.',
            orderIndex: 3,
          },
        ],
      },
    },
  });

  console.log('  ✓ Created: Stranger Danger scenario');

  // Road Safety scenario
  await prisma.safetyScenario.create({
    data: {
      tenantId: TENANT_ID,
      code: 'SAFETY_CROSSING_ROAD',
      title: 'Crossing the Street',
      description: 'Learn how to safely cross the street.',
      scenarioType: 'ROAD_CROSSING',
      sceneDescription:
        'You need to cross the street to get to the park. There is no crosswalk nearby. You see some cars driving, but the road looks clear right now. Your ball rolled to the other side of the street.',
      decisionPrompt: 'What is the safest thing to do?',
      difficultyLevel: 'FOUNDATIONAL',
      minAgeMonths: 48,
      maxAgeMonths: 144,
      isActive: true,
      aiCoachingTemplate:
        'Explain the importance of using crosswalks, looking both ways, and waiting for cars to stop. Emphasize that objects can be replaced but safety cannot.',
      choices: {
        create: [
          {
            choiceText: 'Walk to the nearest crosswalk, look both ways, and cross safely',
            outcome: 'SAFE',
            feedbackText: 'Great choice! Using a crosswalk and looking both ways is the safest.',
            explanation:
              'Using a crosswalk and looking both ways is the safest way to cross the street, even if it takes longer. Drivers expect people to cross at crosswalks.',
            orderIndex: 0,
          },
          {
            choiceText: 'Run quickly across the street to get the ball',
            outcome: 'UNSAFE',
            feedbackText: 'Running across the street is very dangerous!',
            explanation:
              'Cars might not see you in time to stop when you run across. Always use a crosswalk and walk, never run.',
            orderIndex: 1,
          },
          {
            choiceText: 'Wait until there are no cars and then cross right here',
            outcome: 'PARTIALLY_SAFE',
            feedbackText:
              'Waiting for no cars is good, but crossing without a crosswalk is still risky.',
            explanation:
              'Drivers expect people to cross at crosswalks. Crossing in other places can surprise drivers and cause accidents.',
            orderIndex: 2,
          },
          {
            choiceText: 'Ask an adult to help you get the ball',
            outcome: 'SAFE',
            feedbackText:
              'Excellent thinking! Asking an adult for help with road safety is always smart.',
            explanation:
              'Getting help from an adult is a great choice for road safety. They can help you cross safely or retrieve the ball.',
            orderIndex: 3,
          },
        ],
      },
    },
  });

  console.log('  ✓ Created: Road Safety scenario');

  // Fire Safety scenario
  await prisma.safetyScenario.create({
    data: {
      tenantId: TENANT_ID,
      code: 'SAFETY_FIRE_ALARM',
      title: 'Fire Alarm at Home',
      description: 'Learn what to do when the fire alarm sounds.',
      scenarioType: 'FIRE_SAFETY',
      sceneDescription:
        'You are in your bedroom playing when suddenly the fire alarm starts beeping loudly. You can smell something smoky. Your favorite toy is on your bed.',
      decisionPrompt: 'What should you do first?',
      difficultyLevel: 'FOUNDATIONAL',
      minAgeMonths: 36,
      maxAgeMonths: 144,
      isActive: true,
      aiCoachingTemplate:
        'Emphasize the importance of immediate evacuation when a fire alarm sounds. Explain that possessions can be replaced, but safety cannot. Review stop, drop, and roll if clothes catch fire.',
      choices: {
        create: [
          {
            choiceText: 'Leave the room immediately and go outside to the family meeting spot',
            outcome: 'SAFE',
            feedbackText:
              'Perfect! When the fire alarm sounds, getting out quickly is most important.',
            explanation:
              'Your toys can be replaced, but you cannot. Leave immediately and go to your family meeting spot. Do not stop for anything.',
            orderIndex: 0,
          },
          {
            choiceText: 'Grab your favorite toy first, then leave',
            outcome: 'UNSAFE',
            feedbackText: 'Do not stop for anything when there is a fire.',
            explanation:
              'Every second counts during a fire. Your family can get new toys later. Leave immediately and your safety comes first.',
            orderIndex: 1,
          },
          {
            choiceText: 'Hide under the bed until the alarm stops',
            outcome: 'UNSAFE',
            feedbackText: 'Never hide during a fire!',
            explanation:
              'Firefighters need to find you. Hiding makes it harder for them to rescue you. Always get out of the building as quickly as possible.',
            orderIndex: 2,
          },
          {
            choiceText: 'Open the door slowly and check if it is hot',
            outcome: 'PARTIALLY_SAFE',
            feedbackText: 'Checking the door is good, but getting out quickly is most important.',
            explanation:
              'Before opening a door, feel it with the back of your hand. If it is hot, do not open it - find another way out. But the safest thing is to get out right away.',
            orderIndex: 3,
          },
        ],
      },
    },
  });

  console.log('  ✓ Created: Fire Safety scenario');

  // Personal Boundaries scenario
  await prisma.safetyScenario.create({
    data: {
      tenantId: TENANT_ID,
      code: 'SAFETY_PERSONAL_BOUNDARIES',
      title: 'Uncomfortable Touch',
      description: 'Learn about personal boundaries and body autonomy.',
      scenarioType: 'BODY_SAFETY',
      sceneDescription:
        'An adult family friend comes to visit. They give you a big hug even though you do not want one. They say, "Come on, do not be shy! Give me a hug!" You feel uncomfortable.',
      decisionPrompt: 'What can you do?',
      difficultyLevel: 'DEVELOPING',
      minAgeMonths: 48,
      maxAgeMonths: 156,
      isActive: true,
      aiCoachingTemplate:
        'Explain body autonomy - that the child owns their body and has the right to say no to unwanted touch. Emphasize that it is okay to set boundaries even with adults they know.',
      choices: {
        create: [
          {
            choiceText: 'Say "No thank you, I do not want a hug" and step back',
            outcome: 'SAFE',
            feedbackText: 'Excellent! Your body is yours and you always have the right to say no.',
            explanation:
              'You always have the right to say no to touches that make you uncomfortable, even from people you know. Your feelings matter.',
            orderIndex: 0,
          },
          {
            choiceText: 'Hug them because adults told you to',
            outcome: 'UNSAFE',
            feedbackText: 'You do not have to accept touches that make you uncomfortable.',
            explanation:
              'Your feelings matter, and good adults will respect your boundaries. You never have to accept touches that feel wrong.',
            orderIndex: 1,
          },
          {
            choiceText: 'Offer a high-five or wave instead of a hug',
            outcome: 'SAFE',
            feedbackText:
              'Great idea! Offering a different greeting is a good way to keep your boundaries.',
            explanation:
              'You can be friendly while still keeping your boundaries. A wave, high-five, or fist bump are all okay alternatives.',
            orderIndex: 2,
          },
          {
            choiceText: 'Tell your parent or trusted adult how you feel',
            outcome: 'SAFE',
            feedbackText: 'Wonderful choice! Telling a trusted adult is always a good idea.',
            explanation:
              'Telling a trusted adult about uncomfortable situations is always a good idea. They can help protect you and set boundaries.',
            orderIndex: 3,
          },
        ],
      },
    },
  });

  console.log('  ✓ Created: Personal Boundaries scenario');

  console.log('\n✅ Seed completed successfully!');
  console.log(`   - Created 2 life skills with task analyses`);
  console.log(`   - Created 4 safety scenarios`);
}

// Run seed with top-level await
await main().catch((e) => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});

await prisma.$disconnect();
