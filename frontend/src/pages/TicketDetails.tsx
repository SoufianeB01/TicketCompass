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
  MenuItem,
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
  if (Number.isNaN(new Date(date).getTime())) return '—';
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
  const [analyzing, setAnalyzing] = useState(false);
  const [recommending, setRecommending] = useState(false);
  const [recommendationsRequested, setRecommendationsRequested] = useState(false);
  const [recommendationError, setRecommendationError] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | ''>('');
  const [error, setError] = useState('');

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('Medium');
  const [status, setStatus] = useState<TicketStatus>('Open');
  const [resolution, setResolution] = useState('');

  const [expandedEmployee, setExpandedEmployee] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setAnalysis(null);
    setRecommendations([]);
    setRecommendationsRequested(false);
    setRecommendationError('');
    setExpandedEmployee(null);

    Promise.all([getTicketById(ticketId), getEmployees()])
      .then(([ticketData, employeeData]) => {
        if (!active) return;
        setTicket(ticketData);
        setEmployees(employeeData);
        setSelectedEmployeeId(ticketData.assignedEmployeeId ?? '');
        setLoading(false);
        return getTicketAnalysis(ticketId)
          .then(data => { if (active) setAnalysis(data); })
          .catch(() => { if (active) setAnalysis(null); });
      })
      .catch(() => {
        if (!active) return;
        setError('Failed to load ticket.');
        setLoading(false);
      });

    return () => { active = false; };
  }, [ticketId]);

  function startEditing() {
    if (!ticket) return;

    setTitle(ticket.title);
    setDescription(ticket.description);
    setPriority(ticket.priority);
    setStatus(ticket.status);
    setResolution(ticket.resolution ?? '');
    setSelectedEmployeeId(ticket.assignedEmployeeId ?? '');
    setEditing(true);
  }

  function cancelEditing() {
    setSelectedEmployeeId(ticket?.assignedEmployeeId ?? '');
    setEditing(false);
    setError('');
  }

  function saveChanges() {
    if (!ticket || working || analyzing || recommending || !title.trim() || !description.trim()) return;

    setWorking(true);
    setError('');

    const contentChanged =
      title.trim() !== ticket.title || description.trim() !== ticket.description;

    // Status is editable, including moving a resolved ticket back to Open.
    // Resolution is handled by the dedicated endpoint when one is provided.
    const newStatus = status === 'Resolved' && ticket.status !== 'Resolved'
      ? ticket.status : status;

    if (status === 'Resolved' && ticket.status !== 'Resolved' && !resolution.trim()) {
      setError('Enter a resolution before marking the ticket as resolved.');
      setWorking(false);
      return;
    }

    updateTicket(ticketId, {
      ...ticket,
      title: title.trim(),
      description: description.trim(),
      priority,
      status: newStatus,
    })
      .then(async updated => {
        setTicket(updated);
        if (contentChanged) {
          setAnalysis(null);
          setRecommendations([]);
          setRecommendationsRequested(false);
        }

        // Use the existing assignment endpoint when Save changes the assignee.
        // Assign before resolving, because resolved tickets cannot be assigned.
        if (selectedEmployeeId !== '' &&
            selectedEmployeeId !== updated.assignedEmployeeId) {
          updated = await assignTicket(ticketId, selectedEmployeeId);
          setTicket(updated);
        }

        if (status === 'Resolved' && ticket.status !== 'Resolved') {
          updated = await resolveTicket(ticketId, resolution.trim());
          setTicket(updated);
        }
        setSelectedEmployeeId(updated.assignedEmployeeId ?? '');
      })
      .then(() => setEditing(false))
      .catch(() => setError('Could not save changes. Please try again.'))
      .finally(() => setWorking(false));
  }

  function handleAnalyze() {
    if (working || analyzing || recommending) return;
    setAnalyzing(true);
    setError('');
    setAnalysis(null);
    setRecommendations([]);
    setRecommendationsRequested(false);
    setRecommendationError('');
    setExpandedEmployee(null);

    analyzeTicket(ticketId)
      .then(result => setAnalysis(result))
      .catch(() => setError('AI analysis failed. Please try again.'))
      .finally(() => setAnalyzing(false));
  }

  function handleRecommend() {
    if (!analysis || working || analyzing || recommending) return;
    setRecommending(true);
    setRecommendationsRequested(true);
    setRecommendationError('');
    setRecommendations([]);
    setExpandedEmployee(null);

    getRecommendations(ticketId)
      .then(data => {
        setRecommendations(data);
        if (data.length) setExpandedEmployee(data[0].employeeId);
      })
      .catch(() => setRecommendationError('Could not generate recommendations. Please try again.'))
      .finally(() => setRecommending(false));
  }

  function handleAssign(employeeId: number) {
    if (working || analyzing || recommending || ticket?.assignedEmployeeId === employeeId) return;
    setWorking(true);
    setError('');

    assignTicket(ticketId, employeeId)
      .then(updated => {
        setTicket(updated);
        setSelectedEmployeeId(updated.assignedEmployeeId ?? '');
        // Keep the generated recommendations visible after assigning.
      })
      .catch(() => setError('Could not assign employee. Check their capacity and try again.'))
      .finally(() => setWorking(false));
  }

  if (loading) return <CircularProgress />;

  if (!ticket) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBackOutlined />}
          onClick={() => navigate('/tickets')}
        >
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

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <div className="ticket-details-grid">
        <div className="ticket-details-column">

          {/* Ticket Information */}
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
                    disabled={working || analyzing || recommending}
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
                        border:
                          (editing ? status : ticket.status) === item
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
                        border:
                          (editing ? priority : ticket.priority) === item
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

              <div className="ticket-info-row">
                <Typography sx={{ fontWeight: 500 }}>Assigned Employee</Typography>
                {editing ? (
                  <TextField
                    select
                    size="small"
                    fullWidth
                    value={selectedEmployeeId}
                    onChange={event => setSelectedEmployeeId(
                      event.target.value === '' ? '' : Number(event.target.value)
                    )}
                    disabled={working || analyzing || recommending || ticket.status === 'Resolved'}
                  >
                    <MenuItem value="" disabled={ticket.assignedEmployeeId != null}>
                      Not assigned
                    </MenuItem>
                    {employees.map(employee => (
                      <MenuItem key={employee.id} value={employee.id}>
                        {employee.name}
                      </MenuItem>
                    ))}
                  </TextField>
                ) : (
                  <Typography>{assignee?.name ?? 'Not assigned'}</Typography>
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

              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
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
                      disabled={working || analyzing || recommending}
                      sx={{ bgcolor: '#4f46e5' }}
                    >
                      Save
                    </Button>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* AI Ticket Analysis */}
          <Card variant="outlined">
            <CardContent>
              <Box className="ticket-card-header">
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  <AutoAwesomeOutlined
                    sx={{
                      color: '#4f46e5',
                      verticalAlign: 'middle',
                      mr: 1,
                    }}
                  />
                  AI Ticket Analysis
                </Typography>

                <Button
                  variant="contained"
                  startIcon={<AutoAwesomeOutlined />}
                  onClick={handleAnalyze}
                  disabled={working || analyzing || recommending}
                  sx={{ bgcolor: '#4f46e5' }}
                >
                  {analyzing ? 'Analyzing...' : analysis ? 'Analyze Again' : 'Analyze'}
                </Button>
              </Box>

              {analyzing && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <CircularProgress size={20} />
                  <Typography variant="body2" color="text.secondary">
                    AI is analyzing the ticket. This may take a moment...
                  </Typography>
                </Box>
              )}

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

          {/* Assignment Details */}
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Ticket Details
              </Typography>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Assigned Employee
                </Typography>
                <Typography>{assignee?.name ?? 'Not assigned'}</Typography>
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

          {/* Recommended Employees */}
          <Card variant="outlined">
            <CardContent>
              <Box className="ticket-card-header">
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  <PeopleOutlined sx={{ color: '#4f46e5', verticalAlign: 'middle', mr: 1 }} />
                  Recommended Employees
                </Typography>
                <Button
                  variant="contained"
                  startIcon={recommending ? <CircularProgress size={17} color="inherit" /> : <AutoAwesomeOutlined />}
                  disabled={!analysis || working || analyzing || recommending}
                  onClick={handleRecommend}
                  sx={{ bgcolor: '#4f46e5' }}
                >
                  {recommending ? 'Recommending...' : recommendationsRequested ? 'Recommend Again' : 'Recommend'}
                </Button>
              </Box>

              {recommending && (
                <Box sx={{ mb: 2 }}>
                  <LinearProgress sx={{ mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    AI is evaluating skills, experience and capacity...
                  </Typography>
                </Box>
              )}

              {recommendationError && <Alert severity="error" sx={{ mb: 2 }}>{recommendationError}</Alert>}

              {!analysis && (
                <Typography color="text.secondary">
                  Analyze the ticket first to enable recommendations.
                </Typography>
              )}

              {analysis && !recommending && !recommendationsRequested && (
                <Typography color="text.secondary">
                  Click Recommend to find the best available employees.
                </Typography>
              )}

              {analysis && recommendationsRequested && !recommending &&
                !recommendationError && recommendations.length === 0 && (
                  <Typography color="text.secondary">
                    No eligible employees found. You can still assign someone manually above.
                  </Typography>
                )}

              {recommendations.map((recommendation, index) => {
                const employee = employees.find(
                  person => person.id === recommendation.employeeId
                );

                const expanded =
                  expandedEmployee === recommendation.employeeId;

                return (
                  <Box
                    className="recommendation-card"
                    key={recommendation.employeeId}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                      }}
                    >
                      <PersonOutlined sx={{ color: '#64748b' }} />

                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontWeight: 600 }}>
                          {employee?.name ?? 'Unknown Employee'}
                        </Typography>

                        {index === 0 && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            Best match
                          </Typography>
                        )}
                      </Box>

                      <Chip
                        label={`${recommendation.score.toFixed(0)}%`}
                        size="small"
                        sx={{
                          bgcolor: '#dcfce7',
                          color: '#15803d',
                          fontWeight: 700,
                        }}
                      />

                      <Button
                        size="small"
                        variant="contained"
                        disabled={
                          working || analyzing || recommending ||
                          ticket.assignedEmployeeId === recommendation.employeeId
                        }
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
                          setExpandedEmployee(
                            expanded ? null : recommendation.employeeId
                          )
                        }
                      >
                        {expanded ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    </Box>

                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mt: 1.5,
                      }}
                    >
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
                      <Typography
                        sx={{ fontWeight: 600, mt: 2, mb: 1 }}
                      >
                        Why recommended?
                      </Typography>

                      <Typography variant="body2" sx={{ mb: 2 }}>
                        {recommendation.explanation || 'No explanation provided.'}
                      </Typography>

                      <Divider sx={{ mb: 2 }} />

                      <Box
                        sx={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 3,
                        }}
                      >
                        <Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            Skill Match
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600 }}
                          >
                            {recommendation.skillScore}%
                          </Typography>
                        </Box>

                        <Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            Experience
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600 }}
                          >
                            {recommendation.experienceScore}%
                          </Typography>
                        </Box>

                        <Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            Available Capacity
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600 }}
                          >
                            {recommendation.availableCapacity}/
                            {recommendation.maxCapacity}
                          </Typography>
                        </Box>
                      </Box>
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