import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
import "./styles.css";

const rootElement = document.getElementById("root")!;

createRoot(rootElement).render(
  <RouterProvider router={router} />
);
