import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { StatSummary } from '../../types';

interface AnomalyRadarProps {
  data: any[];
  stats: Record<string, StatSummary>;
  cols: string[];
}

export const AnomalyRadar: React.FC<AnomalyRadarProps> = ({ data, stats, cols }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!data || data.length === 0 || !cols || cols.length < 2 || !svgRef.current) return;

    const containerWidth = svgRef.current.parentElement?.clientWidth || 600;
    const margin = { top: 40, right: 40, bottom: 40, left: 60 };
    const width = containerWidth - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const colX = cols[0];
    const colY = cols[1] || cols[0];

    const x = d3.scaleLinear()
      .domain([stats[colX].min, stats[colX].max])
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([stats[colY].min, stats[colY].max])
      .range([height, 0]);

    // Grid lines and axes
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(5).tickSize(-height).tickPadding(10))
      .attr("class", "axis-label")
      .selectAll(".tick line").attr("class", "grid-line");

    g.append("g")
      .call(d3.axisLeft(y).ticks(5).tickSize(-width).tickPadding(10))
      .attr("class", "axis-label")
      .selectAll(".tick line").attr("class", "grid-line");

    // Scatter points
    g.selectAll("circle")
      .data(data)
      .enter()
      .append("circle")
      .attr("cx", d => x(d[colX]))
      .attr("cy", d => y(d[colY]))
      .attr("r", d => {
        const z = (d[colX] - stats[colX].mean) / stats[colX].stdDev;
        return Math.abs(z) > 2.5 ? 6 : 3;
      })
      .attr("fill", d => {
        const z = (d[colX] - stats[colX].mean) / stats[colX].stdDev;
        return Math.abs(z) > 2.5 ? "#e05252" : "#f0a500";
      })
      .attr("fill-opacity", d => {
        const z = (d[colX] - stats[colX].mean) / stats[colX].stdDev;
        return Math.abs(z) > 2.5 ? 0.8 : 0.3;
      })
      .attr("stroke", d => {
        const z = (d[colX] - stats[colX].mean) / stats[colX].stdDev;
        return Math.abs(z) > 2.5 ? "#fff" : "none";
      })
      .attr("stroke-width", 1);

  }, [data, stats, cols]);

  return (
    <div className="w-full h-full min-h-[300px] relative">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
};
