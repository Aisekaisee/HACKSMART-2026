import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const ComparisonCharts = ({ baseline, scenario }) => {
  if (!baseline || !scenario) return null;

  const data = [
    { name: 'Wait Time', baseline: baseline.avg_wait_time, scenario: scenario.avg_wait_time },
    { name: 'Lost Swaps %', baseline: baseline.lost_swaps_pct, scenario: scenario.lost_swaps_pct },
    { name: 'Throughput', baseline: baseline.throughput, scenario: scenario.throughput },
  ];

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
            <XAxis dataKey="name" tick={{fill: '#a3a3a3', fontSize: 10}} />
            <YAxis tick={{fill: '#a3a3a3', fontSize: 10}} />
            <Tooltip 
                contentStyle={{backgroundColor: '#171717', border: '1px solid #262626', color: '#e5e5e5'}}
                cursor={{fill: 'rgba(255,255,255,0.05)'}}
            />
            <Bar dataKey="baseline" fill="#3b82f6" name="Baseline" />
            <Bar dataKey="scenario" fill="#10b981" name="Scenario" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ComparisonCharts;
