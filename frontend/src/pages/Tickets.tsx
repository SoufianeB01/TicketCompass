import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  CircularProgress,
} from '@mui/material';
import { AddOutlined, SearchOutlined } from '@mui/icons-material';
import { getTickets, getEmployees, createTicket } from '../services/api';
import type { Ticket, Employee, TicketPriority } from '../types/models';
import './Tickets.css';

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

function Tickets() {
  const navigate = useNavigate();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('Medium');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getTickets(), getEmployees()])
      .then(([ticketsData, employeesData]) => {
        setTickets(ticketsData);
        setEmployees(employeesData);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredTickets = tickets
    .filter(ticket => {
      const matchesSearch =
        ticket.title.toLowerCase().includes(search.toLowerCase()) ||
        ticket.description.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === 'All' || ticket.status === statusFilter;

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  async function handleCreateTicket() {
    if (!title.trim() || !description.trim()) {
      setError('Please enter a title and description.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const newTicket = await createTicket({
        title: title.trim(),
        description: description.trim(),
        priority,
        status: 'Open',
        requiredSkills: null,
        assignedEmployeeId: null,
        resolution: null,
        resolvedAt: null,
      });

      setTickets([...tickets, newTicket]);
      setDialogOpen(false);
      setTitle('');
      setDescription('');
      setPriority('Medium');

      navigate(`/tickets/${newTicket.id}`);
    } catch {
      setError('Failed to create ticket.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <div className="tickets-page">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Tickets
          </Typography>
          <Typography color="text.secondary">
            Manage and assign support tickets
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddOutlined />}
          onClick={() => setDialogOpen(true)}
          sx={{ bgcolor: '#4f46e5', alignSelf: 'center' }}
        >
          New Ticket
        </Button>
      </Box>

      <Card variant="outlined">
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <TextField
              size="small"
              placeholder="Search tickets..."
              value={search}
              onChange={event => setSearch(event.target.value)}
              slotProps={{
                input: {
                  startAdornment: <SearchOutlined sx={{ mr: 1, color: 'text.secondary' }} />,
                },
              }}
              sx={{ flex: 1 }}
            />

            <FormControl size="small" sx={{ minWidth: 170 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={event => setStatusFilter(event.target.value)}
              >
                <MenuItem value="All">All statuses</MenuItem>
                <MenuItem value="Open">Open</MenuItem>
                <MenuItem value="InProgress">In Progress</MenuItem>
                <MenuItem value="Resolved">Resolved</MenuItem>
              </Select>
            </FormControl>
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
              {filteredTickets.map(ticket => (
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
                      label={ticket.status === 'InProgress' ? 'In Progress' : ticket.status}
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

              {filteredTickets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No tickets found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>New Support Ticket</DialogTitle>

        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Title"
              fullWidth
              value={title}
              onChange={event => setTitle(event.target.value)}
            />

            <TextField
              label="Description"
              fullWidth
              multiline
              rows={4}
              value={description}
              onChange={event => setDescription(event.target.value)}
            />

            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={priority}
                label="Priority"
                onChange={event => setPriority(event.target.value as TicketPriority)}
              >
                <MenuItem value="Low">Low</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="High">High</MenuItem>
                <MenuItem value="Critical">Critical</MenuItem>
              </Select>
            </FormControl>

            {error && (
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateTicket}
            disabled={saving}
            sx={{ bgcolor: '#4f46e5' }}
          >
            {saving ? 'Creating...' : 'Create Ticket'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default Tickets;