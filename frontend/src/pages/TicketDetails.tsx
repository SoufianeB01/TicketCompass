import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  LinearProgress,
  TextField,
  Typography,
  Collapse,
  IconButton,
  Alert,
} from '@mui/material';
import {
  ArrowBackOutlined,
  AutoAwesomeOutlined,
  EditOutlined,
  ExpandLess,
  ExpandMore,
  PersonOutlined,
  PeopleOutlined,
  CalendarTodayOutlined,
} from '@mui/icons-material';

import {
  getTicketById,
  getEmployees,
  getTicketAnalysis,
  analyzeTicket,
  getRecommendations,
  assignTicket,
  updateTicket,
  resolveTicket,
} from '../services/api';
import type {
  Ticket,
  Employee,
  TicketAnalysis,
  Recommendation,
  TicketPriority,
  TicketStatus,
} from '../types/models';

import './TicketDetails.css';

const priorities: TicketPriority[] = ['Low', 'Medium', 'High', 'Critical'];
const statuses: TicketStatus[] = ['Open', 'InProgress', 'Resolved'];

function getPriorityColor(priority: string) {
  if (priority === 'Critical') return { bgcolor: '#fee2e2', color: '#b91c1c' };
  if (priority === 'High') return { bgcolor: '#ffedd5', color: '#c2410c' };
  if (priority === 'Medium') return { bgcolor: '#dbeafe', color: '#1d4ed8' };
  return { bgcolor: '#f1f5f9', color: '#64748b' };
}

function getStatusColor(status: string) {
  if (status === 'Resolved') return { bgcolor: '#dcfce7', color: '#15803d' };
  if (status === 'InProgress') return { bgcolor: '#dbeafe', color: '#1d4ed8' };
  return { bgcolor: '#ede9fe', color: '#6d28d9' };
}

function formatStatus(status: string) {
  if (status === 'InProgress') return 'In Progress';
  return status;
}

function formatDate(date: string) {
  return new Date(date).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function TicketDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const ticketId = Number(id);

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [analysis, setAnalysis] = useState<TicketAnalysis | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('Medium');
  const [status, setStatus] = useState<TicketStatus>('Open');
  const [resolution, setResolution] = useState('');

  const [expandedEmployee, setExpandedEmployee] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      getTicketById(ticketId),
      getEmployees(),
      getTicketAnalysis(ticketId).catch(() => null),
    ]).then(([ticketData, employeeData, analysisData]) => {
      setTicket(ticketData);
      setEmployees(employeeData);
      setAnalysis(analysisData);
      setLoading(false);

      if (analysisData) {
        getRecommendations(ticketId).then(data => {
          setRecommendations(data);
          if (data.length > 0) {
            setExpandedEmployee(data[0].employeeId);
          }
        });
      }
    }).catch(() => {
      setError('Failed to load ticket.');
      setLoading(false);
    });
  }, [ticketId]);

  function startEditing() {
    if (!ticket) return;

    setTitle(ticket.title);
    setDescription(ticket.description);
    setPriority(ticket.priority);
    setStatus(ticket.status);
    setResolution(ticket.resolution ?? '');
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setError('');
  }

  async function saveChanges() {
    if (!ticket || !title.trim() || !description.trim()) return;

    // Resolving a ticket uses the dedicated backend endpoint.
    if (status === 'Resolved' && ticket.status !== 'Resolved') {
      if (!ticket.assignedEmployeeId) {
        setError('Assign an employee before resolving the ticket.');
        return;
      }

      if (!resolution.trim()) {
        setError('Enter a resolution before marking the ticket as resolved.');
        return;
      }
    }

    setWorking(true);
    setError('');

    const contentChanged =
      title.trim() !== ticket.title ||
      description.trim() !== ticket.description;

    const updated = await updateTicket(ticketId, {
      ...ticket,
      title: title.trim(),
      description: description.trim(),
      priority,
      status: status === 'Resolved' ? ticket.status : status,
    });

    setTicket(updated);

    if (contentChanged) {
      setAnalysis(null);
      setRecommendations([]);
    }

    if (status === 'Resolved' && ticket.status !== 'Resolved') {
      const resolved = await resolveTicket(ticketId, resolution.trim());
      setTicket(resolved);
    }

    setEditing(false);
    setWorking(false);
  }

  async function handleAnalyze() {
    setWorking(true);
    setError('');

    const result = await analyzeTicket(ticketId);
    setAnalysis(result);

    const data = await getRecommendations(ticketId);
    setRecommendations(data);

    if (data.length > 0) {
      setExpandedEmployee(data[0].employeeId);
    }

    setWorking(false);
  }

  async function handleAssign(employeeId: number) {
    setWorking(true);
    setError('');

    const updated = await assignTicket(ticketId, employeeId);
    setTicket(updated);

    setWorking(false);
  }

  if (loading) return <CircularProgress />;

  if (!ticket) {
    return (
      <Box>
        <Button startIcon={<ArrowBackOutlined />} onClick={() => navigate('/tickets')}>
          Back to Tickets
        </Button>
        <Alert severity="error">{error || 'Ticket not found.'}</Alert>
      </Box>
    );
  }

  const assignee = employees.find(
    employee => employee.id === ticket.assignedEmployeeId
  );

  return (
    <div className="ticket-details">
      <Button
        size="small"
        startIcon={<ArrowBackOutlined />}
        onClick={() => navigate('/tickets')}
        sx={{ mb: 2 }}
      >
        Back to Tickets
      </Button>

      <Typography variant="h4" sx={{ fontWeight: 700 }}>
        {ticket.title}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Ticket #{ticket.id}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <div className="ticket-details-grid">
        <div className="ticket-details-column">

          <Card variant="outlined">
            <CardContent>
              <Box className="ticket-card-header">
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Ticket Information
                </Typography>

                {!editing && (
                  <Button
                    size="small"
                    startIcon={<EditOutlined />}
                    onClick={startEditing}
                    disabled={ticket.status === 'Resolved'}
                  >
                    Edit
                  </Button>
                )}
              </Box>

              <div className="ticket-info-row">
                <Typography sx={{ fontWeight: 500 }}>Status</Typography>
                <Box className="ticket-options">
                  {statuses.map(item => (
                    <Chip
                      key={item}
                      label={formatStatus(item)}
                      clickable={editing}
                      onClick={editing ? () => setStatus(item) : undefined}
                      sx={{
                        ...getStatusColor(item),
                        opacity: editing || ticket.status === item ? 1 : 0.45,
                        border: status === item && editing
                          ? '2px solid currentColor'
                          : ticket.status === item && !editing
                            ? '2px solid currentColor'
                            : '2px solid transparent',
                      }}
                    />
                  ))}
                </Box>
              </div>

              <div className="ticket-info-row">
                <Typography sx={{ fontWeight: 500 }}>Priority</Typography>
                <Box className="ticket-options">
                  {priorities.map(item => (
                    <Chip
                      key={item}
                      label={item}
                      clickable={editing}
                      onClick={editing ? () => setPriority(item) : undefined}
                      sx={{
                        ...getPriorityColor(item),
                        opacity: editing || ticket.priority === item ? 1 : 0.45,
                        border: (editing ? priority : ticket.priority) === item
                          ? '2px solid currentColor'
                          : '2px solid transparent',
                      }}
                    />
                  ))}
                </Box>
              </div>

              <div className="ticket-info-row">
                <Typography sx={{ fontWeight: 500 }}>Title</Typography>
                {editing ? (
                  <TextField
                    size="small"
                    fullWidth
                    value={title}
                    onChange={event => setTitle(event.target.value)}
                  />
                ) : (
                  <Typography>{ticket.title}</Typography>
                )}
              </div>

              <div className="ticket-info-row">
                <Typography sx={{ fontWeight: 500 }}>Description</Typography>
                {editing ? (
                  <TextField
                    size="small"
                    fullWidth
                    multiline
                    rows={3}
                    value={description}
                    onChange={event => setDescription(event.target.value)}
                  />
                ) : (
                  <Typography sx={{ whiteSpace: 'pre-wrap' }}>
                    {ticket.description}
                  </Typography>
                )}
              </div>

              {editing && status === 'Resolved' && ticket.status !== 'Resolved' && (
                <div className="ticket-info-row">
                  <Typography sx={{ fontWeight: 500 }}>Resolution</Typography>
                  <TextField
                    size="small"
                    fullWidth
                    multiline
                    rows={2}
                    value={resolution}
                    onChange={event => setResolution(event.target.value)}
                    placeholder="How was the issue resolved?"
                  />
                </div>
              )}

              {ticket.status === 'Resolved' && ticket.resolution && (
                <div className="ticket-info-row">
                  <Typography sx={{ fontWeight: 500 }}>Resolution</Typography>
                  <Typography>{ticket.resolution}</Typography>
                </div>
              )}

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CalendarTodayOutlined fontSize="small" color="action" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Created
                    </Typography>
                    <Typography variant="body2">
                      {formatDate(ticket.createdAt)}
                    </Typography>
                  </Box>
                </Box>

                {editing && (
                  <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                    <Button onClick={cancelEditing}>Cancel</Button>
                    <Button
                      variant="contained"
                      onClick={saveChanges}
                      disabled={working}
                      sx={{ bgcolor: '#4f46e5' }}
                    >
                      Save
                    </Button>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Box className="ticket-card-header">
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  <AutoAwesomeOutlined
                    sx={{ color: '#4f46e5', verticalAlign: 'middle', mr: 1 }}
                  />
                  AI Ticket Analysis
                </Typography>

                <Button
                  variant="contained"
                  startIcon={<AutoAwesomeOutlined />}
                  onClick={handleAnalyze}
                  disabled={working || ticket.status === 'Resolved'}
                  sx={{ bgcolor: '#4f46e5' }}
                >
                  {analysis ? 'Analyze Again' : 'Analyze'}
                </Button>
              </Box>

              {analysis ? (
                <>
                  <Typography sx={{ fontWeight: 600, mt: 2 }}>
                    Summary
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {analysis.summary}
                  </Typography>

                  <Typography sx={{ fontWeight: 600 }}>
                    Category
                  </Typography>
                  <Chip
                    label={analysis.category}
                    size="small"
                    variant="outlined"
                    sx={{ my: 1 }}
                  />

                  <Typography sx={{ fontWeight: 600, mt: 1, mb: 1 }}>
                    Required Skills
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {analysis.requiredSkills.map(skill => (
                      <Chip
                        key={skill}
                        label={skill}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </>
              ) : (
                <Typography color="text.secondary" sx={{ mt: 2 }}>
                  Analyze this ticket to identify its category and required skills.
                </Typography>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="ticket-details-column">
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Ticket Details
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <PersonOutlined color="action" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Assigned Employee
                  </Typography>
                  <Typography sx={{ fontWeight: 600 }}>
                    {assignee?.name ?? 'Not assigned'}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CalendarTodayOutlined color="action" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Resolved
                  </Typography>
                  <Typography>
                    {ticket.resolvedAt ? formatDate(ticket.resolvedAt) : '—'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                <PeopleOutlined
                  sx={{ color: '#4f46e5', verticalAlign: 'middle', mr: 1 }}
                />
                Recommended Employees
              </Typography>

              {!analysis && (
                <Typography color="text.secondary">
                  Analyze the ticket to see recommendations.
                </Typography>
              )}

              {analysis && recommendations.length === 0 && (
                <Typography color="text.secondary">
                  No available employees found.
                </Typography>
              )}

              {recommendations.map((recommendation, index) => {
                const employee = employees.find(
                  person => person.id === recommendation.employeeId
                );

                const expanded = expandedEmployee === recommendation.employeeId;

                return (
                  <Box className="recommendation-card" key={recommendation.employeeId}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <PersonOutlined sx={{ color: '#64748b' }} />

                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontWeight: 600 }}>
                          {employee?.name ?? 'Unknown Employee'}
                        </Typography>

                        {index === 0 && (
                          <Typography variant="caption" color="text.secondary">
                            Best match
                          </Typography>
                        )}
                      </Box>

                      <Chip
                        label={`${recommendation.score.toFixed(0)}%`}
                        size="small"
                        sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700 }}
                      />

                      <Button
                        size="small"
                        variant="contained"
                        disabled={working || ticket.status === 'Resolved'}
                        onClick={() => handleAssign(recommendation.employeeId)}
                        sx={{ bgcolor: '#4f46e5' }}
                      >
                        {ticket.assignedEmployeeId === recommendation.employeeId
                          ? 'Assigned'
                          : 'Assign'}
                      </Button>

                      <IconButton
                        size="small"
                        onClick={() =>
                          setExpandedEmployee(expanded ? null : recommendation.employeeId)
                        }
                      >
                        {expanded ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
                      <LinearProgress
                        variant="determinate"
                        value={recommendation.score}
                        sx={{
                          flex: 1,
                          height: 7,
                          borderRadius: 4,
                          bgcolor: '#e5e7eb',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: index === 0 ? '#16a34a' : '#4f46e5',
                          },
                        }}
                      />
                      <Typography variant="body2">
                        {recommendation.score.toFixed(0)}%
                      </Typography>
                    </Box>

                    <Collapse in={expanded}>
                      <Typography sx={{ fontWeight: 600, mt: 2, mb: 1 }}>
                        Why recommended?
                      </Typography>

                      {recommendation.reasons.map((reason, reasonIndex) => (
                        <Typography
                          key={reasonIndex}
                          variant="body2"
                          sx={{ mb: 0.5 }}
                        >
                          • {reason}
                        </Typography>
                      ))}
                    </Collapse>
                  </Box>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default TicketDetails;