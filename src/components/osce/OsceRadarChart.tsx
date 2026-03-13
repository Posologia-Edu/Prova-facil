import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

interface Props {
  data: { category: string; score: number; maxScore: number }[];
}

export function OsceRadarChart({ data }: Props) {
  const chartData = data.map((d) => ({
    category: d.category,
    value: d.maxScore > 0 ? (d.score / d.maxScore) * 100 : 0,
    fullMark: 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
        <PolarGrid strokeDasharray="3 3" />
        <PolarAngleAxis dataKey="category" className="text-xs" />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
        <Radar
          name="Desempenho"
          dataKey="value"
          stroke="hsl(var(--primary))"
          fill="hsl(var(--primary))"
          fillOpacity={0.3}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
