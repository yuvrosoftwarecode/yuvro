import React from "react";
import { SPRINT_DETAILS, STATIC_TICKETS, USER_TICKET } from "./constants";

interface SprintSceneProps {
  isActive: boolean;
}

export function SprintScene({ isActive }: SprintSceneProps) {
  return (
    <div className={`pn ${isActive ? "on" : ""}`} aria-hidden={!isActive}>
      <div className="sh">
        <b>{SPRINT_DETAILS.sprintName}</b>
        <span className="k">
          {SPRINT_DETAILS.feature} · {SPRINT_DETAILS.dateRange}
        </span>
        <span className="cnt">{SPRINT_DETAILS.ticketCount}</span>
      </div>

      <div className="board">
        <div className="cols">
          <div className="cl2">To do</div>
          <div className="cl2">In progress</div>
          <div className="cl2">Done</div>
        </div>

        {STATIC_TICKETS.map((tk) => (
          <div
            key={tk.key}
            className="tk"
            style={
              {
                "--c": tk.col,
                "--r": tk.row,
              } as React.CSSProperties
            }
          >
            <div className="t1">
              <i className={`ty ${tk.type}`} />
              {tk.key}
              <span className="pt">{tk.points}</span>
              <span className="as">{tk.avatar}</span>
            </div>
            <p>{tk.title}</p>
          </div>
        ))}

        {/* Animated ticket */}
        <div
          className="tk me"
          style={
            {
              "--c": 0,
              "--r": 0,
            } as React.CSSProperties
          }
        >
          <div className="t1">
            <i className={`ty ${USER_TICKET.type}`} />
            {USER_TICKET.key}
            <span className="pt">{USER_TICKET.points}</span>
            <span className="as">{USER_TICKET.avatar}</span>
          </div>
          <p>{USER_TICKET.title}</p>
        </div>
      </div>

      <div className="pr">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="6" cy="6" r="2.5" />
          <circle cx="6" cy="18" r="2.5" />
          <circle cx="18" cy="18" r="2.5" />
          <path d="M6 8.5v7M18 15.5V10a3 3 0 0 0-3-3h-3" />
        </svg>
        <b>{USER_TICKET.title}</b>
        <em>{USER_TICKET.prNumber}</em>
        <span className="mg">Merged</span>
      </div>
    </div>
  );
}
