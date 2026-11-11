import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Button,
} from '@mui/material';
import {
  ConfirmationNumberOutlined,
  PendingActionsOutlined,
  AutorenewOutlined,
  CheckCircleOutlined,
} from '@mui/icons-material';
import { getTickets, getEmployees } from '../services/api';
import type { Ticket, Employee } from '../types/models';
import './Dashboard.css';

function getPriorityColor(priority: string) {
  if (priority === 'Critical') {
    return { backgroundColor: '#fee2e2', color: '#b91c1c' };
  }

  if (priority === 'High') {
    return { backgroundColor: '#ffedd5', color: '#c2410c' };
  }

  if (priority === 'Medium') {
    return { backgroundColor: '#dbeafe', color: '#1d4ed8' };
  }

  return { backgroundColor: '#f1f5f9', color: '#64748b' };
}

function getStatusColor(status: string) {
  if (status === 'Resolved') {
    return { backgroundColor: '#dcfce7', color: '#15803d' };
  }

  if (status === 'InProgress') {
    return { backgroundColor: '#dbeafe', color: '#1d4ed8' };
  }

  return { backgroundColor: '#ede9fe', color: '#6d28d9' };
}

function Dashboard() {
  const navigate = useNavigate();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getTickets(), getEmployees()])
      .then(([ticketsData, employeesData]) => {
        setTickets(ticketsData);
        setEmployees(employeesData);
      })
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    {
      label: 'Total Tickets',
      value: tickets.length,
      icon: <ConfirmationNumberOutlined />,
      color: '#4f46e5',
    },
    {
      label: 'Open',
      value: tickets.filter(t => t.status === 'Open').length,
      icon: <PendingActionsOutlined />,
      color: '#ea580c',
    },
    {
      label: 'In Progress',
      value: tickets.filter(t => t.status === 'InProgress').length,
      icon: <AutorenewOutlined />,
      color: '#2563eb',
    },
    {
      label: 'Resolved',
      value: tickets.filter(t => t.status === 'Resolved').length,
      icon: <CheckCircleOutlined />,
      color: '#16a34a',
    },
  ];

  const recentTickets = [...tickets]
    .sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 5);

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <div className="dashboard">
      <Typography variant="h4" sx={{ fontWeight: 700 }}>
        Dashboard
      </Typography>

      <Typography color="text.secondary" sx={{ mb: 4 }}>
        Overview of your support tickets
      </Typography>

      <div className="dashboard-stats">
        {stats.map(stat => (
          <Card key={stat.label} variant="outlined">
            <CardContent className="dashboard-stat-content">
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                }}
              >
                <Typography sx={{ fontWeight: 500 }}>
                  {stat.label}
                </Typography>

                <Box sx={{ color: stat.color, display: 'flex' }}>
                  {stat.icon}
                </Box>
              </Box>

              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {stat.value}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card variant="outlined">
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Recent Tickets
            </Typography>

            <Button onClick={() => navigate('/tickets')}>
              View all
            </Button>
          </Box>

          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Ticket</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Assignee</TableCell>
                <TableCell>Created</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {recentTickets.map(ticket => (
                <TableRow
                  key={ticket.id}
                  hover
                  onClick={() => navigate(`/tickets/${ticket.id}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Typography sx={{ fontWeight: 500 }}>
                      {ticket.title}
                    </Typography>

                    <Typography variant="caption" color="text.secondary">
                      #{ticket.id}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={ticket.priority}
                      size="small"
                      sx={{
                        ...getPriorityColor(ticket.priority),
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={
                        ticket.status === 'InProgress'
                          ? 'In Progress'
                          : ticket.status
                      }
                      size="small"
                      sx={{
                        ...getStatusColor(ticket.status),
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>

                  <TableCell>
                    {employees.find(
                      employee => employee.id === ticket.assignedEmployeeId
                    )?.name ?? '—'}
                  </TableCell>

                  <TableCell>
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}

              {recentTickets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No tickets available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default Dashboard;