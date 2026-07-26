const fs = require("fs");

let source = fs.readFileSync("D:/yuvro/yuvro-labs/src/routes/index.tsx", "utf8");

source = source.replace(
  `import { createFileRoute, Link } from "@tanstack/react-router";`,
  `import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";\nimport { useAuth } from "@/lib/auth";`,
);

const beforeLoadCode = `
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem('access');
      if (token) {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            const role = user.roles?.ylabs || user.roles?.ycode || user.role;
            const r = role?.toLowerCase();
            if (r === 'admin') {
              throw redirect({ to: '/admin' });
            } else if (r === 'recruiter') {
              throw redirect({ to: '/recruiter/dashboard' });
            } else {
              throw redirect({ to: '/student/dashboard' });
            }
          } catch (e) {
            // ignore parsing error
          }
        }
      }
    }
  },`;

source = source.replace(
  `export const Route = createFileRoute("/")({`,
  `export const Route = createFileRoute("/")({${beforeLoadCode}`,
);

const landingCode = `function Landing() {
  const { user, isAuthenticated } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access");
      if (token && isAuthenticated && user) {
        const role = user.roles?.ylabs || user.roles?.ycode || user.role;
        const r = role?.toLowerCase();
        nav({ to: r === "admin" ? "/admin" : r === "recruiter" ? "/recruiter/dashboard" : "/student/dashboard" });
      }
    }
  }, [user, isAuthenticated, nav]);
`;

source = source.replace(`function Landing() {`, landingCode);

fs.writeFileSync("D:/yuvro/yuvro/ylabs-web/src/routes/index.tsx", source);
console.log("Merge completed successfully!");
