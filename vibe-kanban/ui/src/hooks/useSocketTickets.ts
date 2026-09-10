import { useEffect } from "react";
import { io } from "socket.io-client";
import type { TicketChangeEvent } from "../types/kanban";

export function useSocketTickets(onChanged: (event: TicketChangeEvent) => void) {
  useEffect(() => {
    const socket = io("/", {
      transports: ["websocket", "polling"],
      reconnection: true,
    });

    socket.on("tickets:changed", onChanged);
    return () => {
      socket.off("tickets:changed", onChanged);
      socket.close();
    };
  }, [onChanged]);
}
