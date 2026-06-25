// Bundle entry: side-effect imports of every module in load order (each file is a global
// IIFE that attaches to window.PG_*), then mount the app. React / ReactDOM / supabase remain
// global externals loaded from the CDN <script> tags before this bundle.
import './i18n.jsx';
import './charts.jsx';
import './data.jsx';
import './ui.jsx';
import './tweaks-panel.jsx';
import './dashboard.jsx';
import './orders.jsx';
import './scheduling.jsx';
import './shopfloor.jsx';
import './designer.jsx';
import './warehouse.jsx';
import './issue.jsx';
import './fgwarehouse.jsx';
import './fgsales.jsx';
import './masters.jsx';
import './settings.jsx';
import './app.jsx';

const mount = () => {
  if (!window.PG_Root) { setTimeout(mount, 30); return; }
  ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(window.PG_Root));
};
mount();
