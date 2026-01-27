"""
Graph Visualizer

Generate visualizations of knowledge graphs in various formats:
- JSON for D3.js visualization
- DOT for Graphviz
- Cypher for Neo4j Browser
- Interactive HTML
"""
import logging
import json
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Set, Tuple, Any
from enum import Enum
import html

logger = logging.getLogger(__name__)


class VisualizationFormat(str, Enum):
    """Supported visualization formats."""
    D3_JSON = "d3"
    DOT = "dot"
    CYPHER = "cypher"
    HTML = "html"
    MERMAID = "mermaid"


class NodeShape(str, Enum):
    """Node shapes for visualization."""
    CIRCLE = "circle"
    RECTANGLE = "rectangle"
    DIAMOND = "diamond"
    ELLIPSE = "ellipse"


class EdgeStyle(str, Enum):
    """Edge styles for visualization."""
    SOLID = "solid"
    DASHED = "dashed"
    DOTTED = "dotted"


@dataclass
class StudentProgress:
    """Student progress for visualization."""
    student_id: str
    mastery_levels: Dict[str, float] = field(default_factory=dict)
    current_concept: Optional[str] = None
    completed_concepts: List[str] = field(default_factory=list)
    in_progress_concepts: List[str] = field(default_factory=list)


@dataclass
class VisualizationConfig:
    """Configuration for graph visualization."""
    # Node styling
    node_color_by: str = "domain"  # domain, difficulty, mastery
    node_size_by: str = "importance"  # importance, connections, uniform
    default_node_color: str = "#4a90d9"
    default_node_size: int = 30
    min_node_size: int = 15
    max_node_size: int = 60

    # Edge styling
    edge_color_by: str = "type"  # type, confidence, uniform
    edge_thickness_by: str = "confidence"  # confidence, uniform
    default_edge_color: str = "#999999"
    default_edge_thickness: int = 2

    # Layout
    layout_algorithm: str = "force"  # force, hierarchical, circular

    # Labels
    show_labels: bool = True
    show_edge_labels: bool = False
    truncate_labels: int = 20

    # Colors by domain
    domain_colors: Dict[str, str] = field(default_factory=lambda: {
        "math": "#4a90d9",
        "science": "#50c878",
        "cs": "#ff6b6b",
        "humanities": "#ffd93d",
        "languages": "#9b59b6",
        "general": "#95a5a6",
    })

    # Colors by relation type
    relation_colors: Dict[str, str] = field(default_factory=lambda: {
        "prerequisite": "#e74c3c",
        "related": "#3498db",
        "part_of": "#2ecc71",
        "enables": "#f39c12",
        "similar_to": "#9b59b6",
    })

    # Mastery colors
    mastery_colors: Dict[str, str] = field(default_factory=lambda: {
        "not_started": "#cccccc",
        "in_progress": "#ffd93d",
        "mastered": "#50c878",
    })


@dataclass
class KnowledgeGraph:
    """Knowledge graph for visualization."""
    nodes: List[Dict[str, Any]] = field(default_factory=list)
    edges: List[Dict[str, Any]] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


# Sample knowledge graph for visualization
SAMPLE_GRAPH = KnowledgeGraph(
    nodes=[
        {"id": "arithmetic", "name": "Arithmetic", "domain": "math", "difficulty": 0.1},
        {"id": "fractions", "name": "Fractions", "domain": "math", "difficulty": 0.2},
        {"id": "algebra", "name": "Algebra", "domain": "math", "difficulty": 0.4},
        {"id": "geometry", "name": "Geometry", "domain": "math", "difficulty": 0.35},
        {"id": "trigonometry", "name": "Trigonometry", "domain": "math", "difficulty": 0.5},
        {"id": "calculus", "name": "Calculus", "domain": "math", "difficulty": 0.7},
        {"id": "linear_algebra", "name": "Linear Algebra", "domain": "math", "difficulty": 0.65},
        {"id": "statistics", "name": "Statistics", "domain": "math", "difficulty": 0.5},
        {"id": "probability", "name": "Probability", "domain": "math", "difficulty": 0.5},
        {"id": "programming", "name": "Programming", "domain": "cs", "difficulty": 0.3},
        {"id": "data_structures", "name": "Data Structures", "domain": "cs", "difficulty": 0.55},
        {"id": "algorithms", "name": "Algorithms", "domain": "cs", "difficulty": 0.65},
        {"id": "machine_learning", "name": "Machine Learning", "domain": "cs", "difficulty": 0.75},
        {"id": "deep_learning", "name": "Deep Learning", "domain": "cs", "difficulty": 0.85},
        {"id": "physics", "name": "Physics", "domain": "science", "difficulty": 0.55},
        {"id": "chemistry", "name": "Chemistry", "domain": "science", "difficulty": 0.45},
        {"id": "biology", "name": "Biology", "domain": "science", "difficulty": 0.35},
    ],
    edges=[
        {"source": "arithmetic", "target": "algebra", "type": "prerequisite", "confidence": 1.0},
        {"source": "fractions", "target": "algebra", "type": "prerequisite", "confidence": 1.0},
        {"source": "algebra", "target": "calculus", "type": "prerequisite", "confidence": 1.0},
        {"source": "geometry", "target": "trigonometry", "type": "prerequisite", "confidence": 1.0},
        {"source": "trigonometry", "target": "calculus", "type": "prerequisite", "confidence": 1.0},
        {"source": "algebra", "target": "linear_algebra", "type": "prerequisite", "confidence": 1.0},
        {"source": "algebra", "target": "statistics", "type": "prerequisite", "confidence": 1.0},
        {"source": "fractions", "target": "probability", "type": "prerequisite", "confidence": 1.0},
        {"source": "probability", "target": "statistics", "type": "related", "confidence": 0.8},
        {"source": "programming", "target": "data_structures", "type": "prerequisite", "confidence": 1.0},
        {"source": "data_structures", "target": "algorithms", "type": "prerequisite", "confidence": 1.0},
        {"source": "linear_algebra", "target": "machine_learning", "type": "prerequisite", "confidence": 1.0},
        {"source": "statistics", "target": "machine_learning", "type": "prerequisite", "confidence": 1.0},
        {"source": "programming", "target": "machine_learning", "type": "prerequisite", "confidence": 1.0},
        {"source": "machine_learning", "target": "deep_learning", "type": "prerequisite", "confidence": 1.0},
        {"source": "calculus", "target": "deep_learning", "type": "prerequisite", "confidence": 1.0},
        {"source": "calculus", "target": "physics", "type": "prerequisite", "confidence": 1.0},
        {"source": "algebra", "target": "chemistry", "type": "prerequisite", "confidence": 1.0},
        {"source": "chemistry", "target": "biology", "type": "related", "confidence": 0.7},
    ],
    metadata={"name": "Educational Knowledge Graph", "version": "1.0"},
)


class GraphVisualizer:
    """
    Generate visualizations of knowledge graphs.

    Output formats:
    - JSON for D3.js visualization
    - DOT for Graphviz
    - Cypher for Neo4j Browser
    - Interactive HTML

    Usage:
        visualizer = GraphVisualizer()
        d3_json = visualizer.to_d3_json(graph, focus_concept="calculus")
        dot_string = visualizer.to_dot(graph)
        html = visualizer.generate_interactive_html(graph, student_progress)
    """

    def __init__(
        self,
        config: Optional[VisualizationConfig] = None,
    ):
        self.config = config or VisualizationConfig()
        logger.info("GraphVisualizer initialized")

    def to_d3_json(
        self,
        graph: KnowledgeGraph,
        focus_concept: Optional[str] = None,
        depth: int = 2,
    ) -> Dict[str, Any]:
        """
        Convert graph to D3.js compatible JSON format.

        Args:
            graph: Knowledge graph to visualize
            focus_concept: Optional concept to focus on
            depth: Depth of subgraph if focused

        Returns:
            D3.js compatible JSON structure
        """
        nodes = graph.nodes
        edges = graph.edges

        # Filter to subgraph if focus concept specified
        if focus_concept:
            nodes, edges = self._extract_subgraph(graph, focus_concept, depth)

        # Build node index
        node_index = {n["id"]: i for i, n in enumerate(nodes)}

        # Calculate node sizes based on connections
        connection_counts = self._count_connections(nodes, edges)

        # Format nodes for D3
        d3_nodes = []
        for node in nodes:
            node_id = node["id"]
            d3_node = {
                "id": node_id,
                "name": node.get("name", node_id),
                "group": node.get("domain", "general"),
                "size": self._calculate_node_size(node, connection_counts.get(node_id, 0)),
                "color": self._get_node_color(node),
                "difficulty": node.get("difficulty", 0.5),
            }

            # Add focus indicator
            if focus_concept and node_id == focus_concept:
                d3_node["focused"] = True

            d3_nodes.append(d3_node)

        # Format edges for D3
        d3_links = []
        for edge in edges:
            source_idx = node_index.get(edge["source"])
            target_idx = node_index.get(edge["target"])

            if source_idx is not None and target_idx is not None:
                d3_links.append({
                    "source": source_idx,
                    "target": target_idx,
                    "type": edge.get("type", "related"),
                    "value": edge.get("confidence", 1.0),
                    "color": self._get_edge_color(edge),
                })

        return {
            "nodes": d3_nodes,
            "links": d3_links,
            "metadata": {
                **graph.metadata,
                "focus": focus_concept,
                "depth": depth,
                "total_nodes": len(d3_nodes),
                "total_links": len(d3_links),
            },
        }

    def to_dot(
        self,
        graph: KnowledgeGraph,
        title: Optional[str] = None,
    ) -> str:
        """
        Convert graph to DOT format for Graphviz.

        Args:
            graph: Knowledge graph to visualize
            title: Optional title for the graph

        Returns:
            DOT format string
        """
        title = title or graph.metadata.get("name", "Knowledge Graph")

        lines = [
            f'digraph "{title}" {{',
            '  // Graph settings',
            '  rankdir=TB;',
            '  node [shape=ellipse, style=filled];',
            '  edge [arrowhead=normal];',
            '',
            '  // Nodes',
        ]

        # Group nodes by domain for subgraph clustering
        domains: Dict[str, List[Dict]] = {}
        for node in graph.nodes:
            domain = node.get("domain", "general")
            if domain not in domains:
                domains[domain] = []
            domains[domain].append(node)

        # Add nodes grouped by domain
        for domain, nodes in domains.items():
            color = self.config.domain_colors.get(domain, self.config.default_node_color)
            lines.append(f'  subgraph cluster_{domain} {{')
            lines.append(f'    label="{domain.title()}";')
            lines.append(f'    style=dashed;')
            lines.append(f'    color="{color}";')

            for node in nodes:
                node_id = node["id"]
                name = node.get("name", node_id)
                node_color = self._get_node_color(node)
                difficulty = node.get("difficulty", 0.5)

                # Escape special characters
                name = name.replace('"', '\\"')

                lines.append(
                    f'    "{node_id}" [label="{name}", fillcolor="{node_color}", '
                    f'tooltip="Difficulty: {difficulty:.2f}"];'
                )

            lines.append('  }')
            lines.append('')

        # Add edges
        lines.append('  // Edges')
        for edge in graph.edges:
            source = edge["source"]
            target = edge["target"]
            edge_type = edge.get("type", "related")
            confidence = edge.get("confidence", 1.0)
            color = self._get_edge_color(edge)

            style = "solid"
            if edge_type == "related":
                style = "dashed"
            elif edge_type == "similar_to":
                style = "dotted"

            penwidth = max(1, int(confidence * 3))

            label = f' [label="{edge_type}", color="{color}", style={style}, penwidth={penwidth}]' if self.config.show_edge_labels else f' [color="{color}", style={style}, penwidth={penwidth}]'
            lines.append(f'  "{source}" -> "{target}"{label};')

        lines.append('}')

        return '\n'.join(lines)

    def to_cypher(
        self,
        graph: KnowledgeGraph,
    ) -> str:
        """
        Convert graph to Cypher queries for Neo4j.

        Args:
            graph: Knowledge graph to visualize

        Returns:
            Cypher query string
        """
        lines = [
            '// Create nodes',
        ]

        # Create nodes
        for node in graph.nodes:
            node_id = node["id"]
            name = node.get("name", node_id).replace("'", "\\'")
            domain = node.get("domain", "general")
            difficulty = node.get("difficulty", 0.5)

            lines.append(
                f"CREATE (:{domain.title()}:Concept {{id: '{node_id}', name: '{name}', "
                f"domain: '{domain}', difficulty: {difficulty}}})"
            )

        lines.append('')
        lines.append('// Create relationships')

        # Create relationships
        for edge in graph.edges:
            source = edge["source"]
            target = edge["target"]
            rel_type = edge.get("type", "RELATED_TO").upper().replace(" ", "_")
            confidence = edge.get("confidence", 1.0)

            lines.append(
                f"MATCH (a:Concept {{id: '{source}'}}), (b:Concept {{id: '{target}'}}) "
                f"CREATE (a)-[:{rel_type} {{confidence: {confidence}}}]->(b)"
            )

        lines.append('')
        lines.append('// Return the graph')
        lines.append('MATCH (n:Concept)-[r]->(m:Concept) RETURN n, r, m')

        return '\n'.join(lines)

    def to_mermaid(
        self,
        graph: KnowledgeGraph,
    ) -> str:
        """
        Convert graph to Mermaid diagram format.

        Args:
            graph: Knowledge graph to visualize

        Returns:
            Mermaid diagram string
        """
        lines = ['graph TD']

        # Add node definitions with styling
        for node in graph.nodes:
            node_id = node["id"].replace(" ", "_")
            name = node.get("name", node["id"])
            domain = node.get("domain", "general")

            # Different shapes for different domains
            if domain == "math":
                lines.append(f'    {node_id}["{name}"]')
            elif domain == "cs":
                lines.append(f'    {node_id}("{name}")')
            elif domain == "science":
                lines.append(f'    {node_id}{{"{name}"}}')
            else:
                lines.append(f'    {node_id}["{name}"]')

        lines.append('')

        # Add edges
        for edge in graph.edges:
            source = edge["source"].replace(" ", "_")
            target = edge["target"].replace(" ", "_")
            edge_type = edge.get("type", "related")

            if edge_type == "prerequisite":
                lines.append(f'    {source} --> {target}')
            elif edge_type == "related":
                lines.append(f'    {source} -.- {target}')
            else:
                lines.append(f'    {source} --> {target}')

        # Add styling
        lines.append('')
        lines.append('    %% Styling')
        for domain, color in self.config.domain_colors.items():
            class_name = f'class{domain.title()}'
            lines.append(f'    classDef {class_name} fill:{color},stroke:#333,stroke-width:2px')

        return '\n'.join(lines)

    def generate_interactive_html(
        self,
        graph: KnowledgeGraph,
        student_progress: Optional[StudentProgress] = None,
        title: Optional[str] = None,
    ) -> str:
        """
        Generate interactive HTML visualization using D3.js.

        Args:
            graph: Knowledge graph to visualize
            student_progress: Optional student progress for coloring
            title: Optional title

        Returns:
            Complete HTML page with interactive visualization
        """
        title = title or graph.metadata.get("name", "Knowledge Graph")

        # Get D3 JSON with progress info
        d3_data = self.to_d3_json(graph)

        # Apply student progress coloring
        if student_progress:
            d3_data = self._apply_progress_coloring(d3_data, student_progress)

        # Convert to JSON string
        data_json = json.dumps(d3_data, indent=2)

        html_template = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{html.escape(title)}</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
        }}
        #container {{
            display: flex;
            flex-direction: column;
            height: 100vh;
        }}
        header {{
            background: #2c3e50;
            color: white;
            padding: 1rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        header h1 {{
            font-size: 1.5rem;
        }}
        #graph-container {{
            flex: 1;
            position: relative;
        }}
        svg {{
            width: 100%;
            height: 100%;
            background: white;
        }}
        .node {{
            cursor: pointer;
        }}
        .node circle {{
            stroke: #fff;
            stroke-width: 2px;
            transition: all 0.3s ease;
        }}
        .node:hover circle {{
            stroke-width: 4px;
            filter: brightness(1.1);
        }}
        .node.focused circle {{
            stroke: #f39c12;
            stroke-width: 4px;
        }}
        .node text {{
            font-size: 12px;
            fill: #333;
            pointer-events: none;
        }}
        .link {{
            fill: none;
            stroke-opacity: 0.6;
            transition: stroke-opacity 0.3s ease;
        }}
        .link:hover {{
            stroke-opacity: 1;
        }}
        #tooltip {{
            position: absolute;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 15px;
            border-radius: 6px;
            font-size: 14px;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s ease;
            max-width: 300px;
        }}
        #tooltip.visible {{
            opacity: 1;
        }}
        #legend {{
            position: absolute;
            bottom: 20px;
            left: 20px;
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        #legend h3 {{
            margin-bottom: 10px;
            font-size: 14px;
        }}
        .legend-item {{
            display: flex;
            align-items: center;
            margin: 5px 0;
        }}
        .legend-color {{
            width: 20px;
            height: 20px;
            border-radius: 50%;
            margin-right: 10px;
        }}
        #controls {{
            position: absolute;
            top: 20px;
            right: 20px;
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        #controls button {{
            display: block;
            width: 100%;
            padding: 8px 16px;
            margin: 5px 0;
            border: none;
            background: #3498db;
            color: white;
            border-radius: 4px;
            cursor: pointer;
            transition: background 0.2s ease;
        }}
        #controls button:hover {{
            background: #2980b9;
        }}
        #search {{
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            width: 200px;
        }}
    </style>
</head>
<body>
    <div id="container">
        <header>
            <h1>{html.escape(title)}</h1>
            <input type="text" id="search" placeholder="Search concepts...">
        </header>
        <div id="graph-container">
            <svg></svg>
            <div id="tooltip"></div>
            <div id="legend">
                <h3>Domains</h3>
                <div class="legend-item">
                    <div class="legend-color" style="background: #4a90d9;"></div>
                    <span>Mathematics</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background: #50c878;"></div>
                    <span>Science</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background: #ff6b6b;"></div>
                    <span>Computer Science</span>
                </div>
            </div>
            <div id="controls">
                <button onclick="resetZoom()">Reset View</button>
                <button onclick="toggleLabels()">Toggle Labels</button>
            </div>
        </div>
    </div>
    <script>
        const data = {data_json};

        const container = document.getElementById('graph-container');
        const width = container.clientWidth;
        const height = container.clientHeight;

        const svg = d3.select('svg')
            .attr('viewBox', [0, 0, width, height]);

        const g = svg.append('g');

        // Zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => g.attr('transform', event.transform));

        svg.call(zoom);

        // Tooltip
        const tooltip = d3.select('#tooltip');

        // Create force simulation
        const simulation = d3.forceSimulation(data.nodes)
            .force('link', d3.forceLink(data.links).id((d, i) => i).distance(100))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(d => d.size + 10));

        // Create links
        const link = g.append('g')
            .attr('class', 'links')
            .selectAll('path')
            .data(data.links)
            .join('path')
            .attr('class', 'link')
            .attr('stroke', d => d.color)
            .attr('stroke-width', d => Math.max(1, d.value * 3))
            .attr('marker-end', 'url(#arrowhead)');

        // Arrow marker
        svg.append('defs').append('marker')
            .attr('id', 'arrowhead')
            .attr('viewBox', '-0 -5 10 10')
            .attr('refX', 20)
            .attr('refY', 0)
            .attr('orient', 'auto')
            .attr('markerWidth', 8)
            .attr('markerHeight', 8)
            .append('path')
            .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
            .attr('fill', '#999');

        // Create nodes
        const node = g.append('g')
            .attr('class', 'nodes')
            .selectAll('g')
            .data(data.nodes)
            .join('g')
            .attr('class', d => d.focused ? 'node focused' : 'node')
            .call(d3.drag()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended));

        node.append('circle')
            .attr('r', d => d.size)
            .attr('fill', d => d.color);

        node.append('text')
            .attr('dy', d => d.size + 15)
            .attr('text-anchor', 'middle')
            .text(d => d.name.length > 20 ? d.name.substring(0, 17) + '...' : d.name);

        // Tooltip events
        node.on('mouseover', function(event, d) {{
            tooltip.html(`
                <strong>${{d.name}}</strong><br>
                Domain: ${{d.group}}<br>
                Difficulty: ${{d.difficulty.toFixed(2)}}
            `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px')
            .classed('visible', true);
        }})
        .on('mouseout', function() {{
            tooltip.classed('visible', false);
        }});

        // Simulation tick
        simulation.on('tick', () => {{
            link.attr('d', d => {{
                const dx = d.target.x - d.source.x;
                const dy = d.target.y - d.source.y;
                return `M${{d.source.x}},${{d.source.y}}L${{d.target.x}},${{d.target.y}}`;
            }});

            node.attr('transform', d => `translate(${{d.x}},${{d.y}})`);
        }});

        // Drag functions
        function dragstarted(event) {{
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }}

        function dragged(event) {{
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }}

        function dragended(event) {{
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }}

        // Controls
        function resetZoom() {{
            svg.transition().duration(750).call(
                zoom.transform,
                d3.zoomIdentity
            );
        }}

        let labelsVisible = true;
        function toggleLabels() {{
            labelsVisible = !labelsVisible;
            node.selectAll('text').style('opacity', labelsVisible ? 1 : 0);
        }}

        // Search
        document.getElementById('search').addEventListener('input', function(e) {{
            const query = e.target.value.toLowerCase();
            node.style('opacity', d =>
                query === '' || d.name.toLowerCase().includes(query) ? 1 : 0.2
            );
        }});
    </script>
</body>
</html>'''

        return html_template

    def _extract_subgraph(
        self,
        graph: KnowledgeGraph,
        focus_concept: str,
        depth: int,
    ) -> Tuple[List[Dict], List[Dict]]:
        """Extract subgraph around a focus concept."""
        # Build adjacency
        adjacency: Dict[str, Set[str]] = {}
        for edge in graph.edges:
            source = edge["source"]
            target = edge["target"]
            if source not in adjacency:
                adjacency[source] = set()
            if target not in adjacency:
                adjacency[target] = set()
            adjacency[source].add(target)
            adjacency[target].add(source)

        # BFS to find nodes within depth
        included_nodes = {focus_concept}
        current_level = {focus_concept}

        for _ in range(depth):
            next_level = set()
            for node in current_level:
                neighbors = adjacency.get(node, set())
                for neighbor in neighbors:
                    if neighbor not in included_nodes:
                        next_level.add(neighbor)
                        included_nodes.add(neighbor)
            current_level = next_level

        # Filter nodes and edges
        filtered_nodes = [n for n in graph.nodes if n["id"] in included_nodes]
        filtered_edges = [
            e for e in graph.edges
            if e["source"] in included_nodes and e["target"] in included_nodes
        ]

        return filtered_nodes, filtered_edges

    def _count_connections(
        self,
        nodes: List[Dict],
        edges: List[Dict],
    ) -> Dict[str, int]:
        """Count connections for each node."""
        counts = {n["id"]: 0 for n in nodes}
        for edge in edges:
            source = edge["source"]
            target = edge["target"]
            if source in counts:
                counts[source] += 1
            if target in counts:
                counts[target] += 1
        return counts

    def _calculate_node_size(
        self,
        node: Dict,
        connection_count: int,
    ) -> int:
        """Calculate node size based on configuration."""
        if self.config.node_size_by == "connections":
            # Scale by connections
            base = self.config.min_node_size
            scale = min(connection_count * 5, self.config.max_node_size - base)
            return base + scale
        elif self.config.node_size_by == "importance":
            # Use difficulty as importance proxy
            difficulty = node.get("difficulty", 0.5)
            range_size = self.config.max_node_size - self.config.min_node_size
            return int(self.config.min_node_size + difficulty * range_size)
        else:
            return self.config.default_node_size

    def _get_node_color(self, node: Dict) -> str:
        """Get color for a node based on configuration."""
        if self.config.node_color_by == "domain":
            domain = node.get("domain", "general")
            return self.config.domain_colors.get(domain, self.config.default_node_color)
        elif self.config.node_color_by == "difficulty":
            difficulty = node.get("difficulty", 0.5)
            # Green to red gradient
            r = int(255 * difficulty)
            g = int(255 * (1 - difficulty))
            return f"rgb({r}, {g}, 100)"
        else:
            return self.config.default_node_color

    def _get_edge_color(self, edge: Dict) -> str:
        """Get color for an edge based on configuration."""
        if self.config.edge_color_by == "type":
            edge_type = edge.get("type", "related")
            return self.config.relation_colors.get(edge_type, self.config.default_edge_color)
        else:
            return self.config.default_edge_color

    def _apply_progress_coloring(
        self,
        d3_data: Dict[str, Any],
        progress: StudentProgress,
    ) -> Dict[str, Any]:
        """Apply student progress coloring to nodes."""
        for node in d3_data["nodes"]:
            node_id = node["id"]

            if node_id in progress.completed_concepts:
                node["color"] = self.config.mastery_colors["mastered"]
                node["status"] = "completed"
            elif node_id in progress.in_progress_concepts:
                node["color"] = self.config.mastery_colors["in_progress"]
                node["status"] = "in_progress"
            elif node_id == progress.current_concept:
                node["color"] = self.config.mastery_colors["in_progress"]
                node["status"] = "current"
                node["focused"] = True
            else:
                # Check mastery level
                mastery = progress.mastery_levels.get(node_id, 0.0)
                if mastery >= 0.8:
                    node["color"] = self.config.mastery_colors["mastered"]
                elif mastery > 0:
                    node["color"] = self.config.mastery_colors["in_progress"]
                else:
                    node["color"] = self.config.mastery_colors["not_started"]

            # Add mastery level to node
            node["mastery"] = progress.mastery_levels.get(node_id, 0.0)

        return d3_data

    def visualize(
        self,
        graph: KnowledgeGraph,
        format: str = "d3",
        **kwargs,
    ) -> Any:
        """
        Unified visualization method.

        Args:
            graph: Knowledge graph to visualize
            format: Output format (d3, dot, cypher, html, mermaid)
            **kwargs: Additional format-specific arguments

        Returns:
            Visualization in requested format
        """
        format = format.lower()

        if format == "d3":
            return self.to_d3_json(
                graph,
                focus_concept=kwargs.get("focus_concept"),
                depth=kwargs.get("depth", 2),
            )
        elif format == "dot":
            return self.to_dot(graph, title=kwargs.get("title"))
        elif format == "cypher":
            return self.to_cypher(graph)
        elif format == "html":
            return self.generate_interactive_html(
                graph,
                student_progress=kwargs.get("student_progress"),
                title=kwargs.get("title"),
            )
        elif format == "mermaid":
            return self.to_mermaid(graph)
        else:
            raise ValueError(f"Unsupported format: {format}")

    @staticmethod
    def get_sample_graph() -> KnowledgeGraph:
        """Get a sample knowledge graph for testing."""
        return SAMPLE_GRAPH
