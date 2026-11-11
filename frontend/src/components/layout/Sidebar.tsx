import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ExploreOutlined,
  DashboardOutlined,
  ConfirmationNumberOutlined,
  PeopleOutlined,
  MenuBookOutlined,
  AutoAwesomeOutlined,
} from '@mui/icons-material';
import { getActiveModel } from '../../services/api';
import './Sidebar.css';

function Sidebar() {
  const [model, setModel] = useState('Loading...');

  useEffect(() => {
    getActiveModel()
      .then(data => setModel(data.model))
      .catch(() => setModel('Unavailable'));
  }, []);

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: <DashboardOutlined /> },
    { name: 'Tickets', path: '/tickets', icon: <ConfirmationNumberOutlined /> },
    { name: 'Employees', path: '/employees', icon: <PeopleOutlined /> },
    { name: 'Knowledge Base', path: '/knowledge-base', icon: <MenuBookOutlined /> },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <ExploreOutlined />
        <span>TicketCompass</span>
      </div>

      <nav className="sidebar-navigation">
        {menuItems.map(item => (
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
        <AutoAwesomeOutlined className="sidebar-model-icon" />

        <div>
          <div className="sidebar-model-label">ACTIVE LLM MODEL</div>
          <div className="sidebar-model-name">{model}</div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
