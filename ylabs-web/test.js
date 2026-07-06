const fs = require('fs');
const files = {
  'App.jsx': 'import React from \"react\"; export default function App() { return <div>hello</div>; }',
  'ProfileCard.jsx': 'export default function ProfileCard() { return <div/>; }'
};
const virtualFiles = {};
let cssText = '';
for (const [name, content] of Object.entries(files)) {
  if (name.endsWith('.jsx') || name.endsWith('.js')) {
    virtualFiles[name] = content;
  } else if (name.endsWith('.css')) {
    cssText += content + '\\n';
  }
}
const origin = 'http://localhost:8081';
const html = \<!DOCTYPE html>
<html>
<head>
  <meta charset=\"utf-8\" />
  <script src=\"\/react.production.min.js\"></script>
  <script src=\"\/react-dom.production.min.js\"></script>
  <script src=\"\/babel.min.js\"></script>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; }
    \
  </style>
</head>
<body>
  <div id=\"root\"><div style=\"padding:8px;color:#888;font-family:monospace;font-size:12px\">Loading…</div></div>
  <script>
    window.onerror = function(msg, src, line, col, err) {
      var root = document.getElementById('root');
      if (root) root.innerHTML = '<div style=\"color:#b00;padding:1rem;font-family:monospace;white-space:pre-wrap\"><b>Script Error</b><br>' + msg + '</div>';
    };

    window.__files = \;
    window.__modules = {};
  </script>
</body>
</html>\;
console.log(html);
