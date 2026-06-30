import fs from 'fs';

let content = fs.readFileSync('src/client/App.tsx', 'utf-8');

// 1. Add state
content = content.replace(
  "const [chatMessage, setChatMessage] = useState('');",
  "const [chatMessage, setChatMessage] = useState('');\n  const [activeTab, setActiveTab] = useState<'dashboard' | 'map' | 'controls' | 'chat'>('dashboard');"
);

// 2. Extract panels.
function extractPanel(title) {
  const startTag = `<Panel title="${title}"`;
  const startIdx = content.indexOf(startTag);
  if (startIdx === -1) throw new Error("Missing panel: " + title);
  
  let openCount = 0;
  let i = startIdx;
  let endIdx = -1;
  while (i < content.length) {
    if (content.substring(i, i + 6) === '<Panel') {
      openCount++;
    } else if (content.substring(i, i + 8) === '</Panel>') {
      openCount--;
      if (openCount === 0) {
        endIdx = i + 8;
        break;
      }
    }
    i++;
  }
  return content.substring(startIdx, endIdx);
}

const overview = extractPanel("Overview");
const players = extractPanel("Players");
const cabins = extractPanel("Cabins");
const performance = extractPanel("Performance");
const controls = extractPanel("Controls");
const map = extractPanel("Live screenshot").replace('className="screenshot-frame"', 'className="screenshot-frame full-map"');
const chat = extractPanel("Chat bridge");
const diagnostics = extractPanel("Diagnostics");
const danger = extractPanel("Danger zone");

const newLayout = `
      <nav className="stardew-tabs">
        <button className={\`tab-button \${activeTab === 'dashboard' ? 'active' : ''}\`} onClick={() => setActiveTab('dashboard')}>Dashboard</button>
        <button className={\`tab-button \${activeTab === 'map' ? 'active' : ''}\`} onClick={() => setActiveTab('map')}>Map View</button>
        <button className={\`tab-button \${activeTab === 'controls' ? 'active' : ''}\`} onClick={() => setActiveTab('controls')}>Controls</button>
        <button className={\`tab-button \${activeTab === 'chat' ? 'active' : ''}\`} onClick={() => setActiveTab('chat')}>Chat Bridge</button>
      </nav>

      <section className="tab-content">
        {activeTab === 'dashboard' && (
          <div className="layout-grid">
            <div className="column">
              ${overview}
              ${players}
            </div>
            <div className="column">
              ${performance}
              ${cabins}
            </div>
            <div className="column">
              ${diagnostics}
            </div>
          </div>
        )}

        {activeTab === 'map' && (
          <div className="layout-single">
            ${map}
          </div>
        )}

        {activeTab === 'controls' && (
          <div className="layout-grid">
            <div className="column">
              ${controls}
            </div>
            <div className="column">
              ${danger}
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="layout-single">
            ${chat}
          </div>
        )}
      </section>`;

const layoutStart = content.indexOf('<section className="layout-grid">');

let layoutOpen = 0;
let layoutEnd = -1;
let idx = layoutStart;
while (idx < content.length) {
  if (content.substring(idx, idx + 8) === '<section') {
    layoutOpen++;
  } else if (content.substring(idx, idx + 10) === '</section>') {
    layoutOpen--;
    if (layoutOpen === 0) {
      layoutEnd = idx + 10;
      break;
    }
  }
  idx++;
}

content = content.substring(0, layoutStart) + newLayout + content.substring(layoutEnd);

fs.writeFileSync('src/client/App.tsx', content);
console.log("Refactored App.tsx successfully.");
