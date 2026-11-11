import { NavLink } from 'react-router-dom';
import {
  ExploreOutlined,
  DashboardOutlined,
  ConfirmationNumberOutlined,
  PeopleOutlined,
  BarChartOutlined,
} from '@mui/icons-material';
import './Sidebar.css';

function Sidebar() {
  const menuItems = [
    { name: 'Dashboard', path: '/', icon: <DashboardOutlined /> },
    { name: 'Tickets', path: '/tickets', icon: <ConfirmationNumberOutlined /> },
    { name: 'Employees', path: '/employees', icon: <PeopleOutlined /> },
    { name: 'Analytics', path: '/analytics', icon: <BarChartOutlined /> },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <ExploreOutlined />
        <span>TicketCompass</span>
      </div>

      <nav className="sidebar-navigation">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
            }
          >
            {item.icon}
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        Smart Support Assistant
      </div>
    </aside>
  );
}

export default Sidebar;