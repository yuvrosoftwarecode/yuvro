import React from "react";
import { Card } from "@/components/profile-ui/Card";
import { MockInterviewPerformance } from "../types";
import { EmptyState } from "@/components/profile-ui/EmptyState";
import { Button } from "@/components/profile-ui/Button";
import { MockInterviewTrendChart } from "../charts/MockInterviewTrendChart";
import { ProgressBar } from "@/components/profile-ui/ProgressBar";

interface MockInterviewChartProps {
  data: MockInterviewPerformance;
}

export const MockInterviewChart: React.FC<MockInterviewChartProps> = ({
  data,
}) => {
  const points = data.trendPoints || [];
  const hasInterviews = points.length > 0;
  const dimensions = data.dimensions || [];

  return (
    <Card className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-4">
      <div>
        <div className="flex items-center justify-between mb-3 border-b border-line pb-2.5">
          <h2 className="text-base font-semibold text-ink">
            Mock interview performance
          </h2>
          {hasInterviews && (
            <a
              href="/mock-interviews"
              className="text-xs hover:text-primary hover:underline font-medium transition-colors"
            >
              Practice &rarr;
            </a>
          )}
        </div>

        {hasInterviews ? (
          <div className="space-y-4">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold text-ink tracking-tight">
                    {data.latestScore > 0 ? data.latestScore : points[points.length - 1]}
                  </span>
                  <span className="text-sm font-medium text-muted">/ 10</span>
                </div>
                <p className="text-xs text-muted mt-0.5">
                  Latest of {points.length} {points.length === 1 ? "interview" : "interviews"}
                </p>
              </div>
            </div>

            {/* Score trend chart from charts/ */}
            <MockInterviewTrendChart scores={points} />

            {/* Breakdown bars */}
            <div className="space-y-2.5 pt-2 border-t border-line">
              {dimensions.map((dim) => (
                <div key={dim.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-sub">
                    <span className="font-medium">{dim.name}</span>
                    <span className="font-semibold text-ink">{dim.score}%</span>
                  </div>
                  <ProgressBar value={dim.score} height={5} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState
            title="No mock interviews taken"
            description="Practice AI-guided technical system design and coding interviews with instant feedback."
            action={
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  window.location.href = "/mock-interviews";
                }}
              >
                Start mock interview
              </Button>
            }
          />
        )}
      </div>
    </Card>
  );
};
