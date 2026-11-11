import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  MenuBookOutlined,
  SearchOutlined,
} from '@mui/icons-material';

import { getEmployees, getTicketAnalysis } from '../services/api';
import type { Employee, Ticket, TicketAnalysis } from '../types/models';
import './KnowledgeBase.css';

type KnowledgeTicket = {
  ticket: Ticket;
  analysis: TicketAnalysis | null;
};

type CategoryGroup = {
  category: string;
  items: KnowledgeTicket[];
};

function formatDate(date: string | null) {
  if (!date) return '—';

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '—';

  return parsed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function KnowledgeBase() {
  const navigate = useNavigate();

  const [items, setItems] = useState<KnowledgeTicket[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [ticketResponse, employeeData] = await Promise.all([
          fetch('/api/tickets/status/Resolved'),
          getEmployees(),
        ]);

        if (!ticketResponse.ok) {
          throw new Error('Failed to load resolved tickets');
        }

        const tickets = (await ticketResponse.json()) as Ticket[];

        // Only retrieve existing analyses. No new AI calls.
        const results: KnowledgeTicket[] = await Promise.all(
          tickets.map(async ticket => {
            const analysis = await getTicketAnalysis(ticket.id)
              .catch(() => null);

            return { ticket, analysis };
          })
        );

        if (!active) return;

        setEmployees(employeeData);
        setItems(results);
      } catch {
        if (active) {
          setError('Could not load the Knowledge Base. Please refresh the page.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const employeeById = useMemo(
    () => new Map(employees.map(employee => [employee.id, employee])),
    [employees]
  );

  const groups = useMemo<CategoryGroup[]>(() => {
    const byCategory = new Map<string, KnowledgeTicket[]>();

    for (const item of items) {
      const category = item.analysis?.category?.trim() || 'Uncategorized';
      const existing = byCategory.get(category) ?? [];

      existing.push(item);
      byCategory.set(category, existing);
    }

    const query = search.trim().toLowerCase();

    return [...byCategory.entries()]
      .map(([category, categoryItems]) => ({
        category,
        items: categoryItems.filter(({ ticket, analysis }) => {
          if (!query) return true;

          const employee = ticket.assignedEmployeeId == null
            ? undefined
            : employeeById.get(ticket.assignedEmployeeId);

          return [
            category,
            String(ticket.id),
            ticket.title,
            ticket.description,
            ticket.resolution ?? '',
            analysis?.summary ?? '',
            employee?.name ?? '',
            ...(analysis?.requiredSkills ?? []),
            ...(employee?.skills ?? []),
          ].some(value => value.toLowerCase().includes(query));
        }),
      }))
      .filter(group => group.items.length > 0)
      .sort((a, b) => a.category.localeCompare(b.category));
  }, [items, employeeById, search]);

  function toggleCategory(category: string) {
    setExpanded(current =>
      current.includes(category)
        ? current.filter(item => item !== category)
        : [...current, category]
    );
  }

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box className="knowledge-base-page">
      <Box className="knowledge-base-header">
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Knowledge Base
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Resolved tickets, solutions and team experience
          </Typography>
        </Box>

        <Chip
          icon={<MenuBookOutlined />}
          label={`${items.length} resolved tickets`}
          variant="outlined"
        />
      </Box>

      {error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <Card variant="outlined">
          <CardContent>
            <TextField
              fullWidth
              size="small"
              placeholder="Search categories, tickets, solutions or employees..."
              value={search}
              onChange={event => setSearch(event.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchOutlined />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ mb: 2 }}
            />

            {groups.length === 0 ? (
              <Typography
                color="text.secondary"
                sx={{ py: 3, textAlign: 'center' }}
              >
                {items.length === 0
                  ? 'No resolved tickets available.'
                  : 'No matching results.'}
              </Typography>
            ) : (
              groups.map(group => {
                const isOpen =
                  Boolean(search.trim()) ||
                  expanded.includes(group.category);

                return (
                  <Box
                    className="knowledge-category"
                    key={group.category}
                  >
                    <Box
                      className="knowledge-category-header"
                      role="button"
                      tabIndex={0}
                      aria-expanded={isOpen}
                      onClick={() => toggleCategory(group.category)}
                      onKeyDown={event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          toggleCategory(group.category);
                        }
                      }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 600 }}>
                          {group.category}
                        </Typography>

                        <Typography
                          variant="caption"
                          color="text.secondary"
                        >
                          {group.items.length} resolved tickets
                        </Typography>
                      </Box>

                      <IconButton
                        size="small"
                        tabIndex={-1}
                        aria-label={`Toggle ${group.category}`}
                      >
                        {isOpen ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    </Box>

                    <Collapse in={isOpen}>
                      <TableContainer>
                        <Table
                          size="small"
                          className="knowledge-table"
                        >
                          <TableHead>
                            <TableRow>
                              <TableCell>Ticket</TableCell>
                              <TableCell>Employee</TableCell>
                              <TableCell>Resolution</TableCell>
                              <TableCell>Resolved Date</TableCell>
                            </TableRow>
                          </TableHead>

                          <TableBody>
                            {group.items.map(({ ticket }) => {
                              const employee =
                                ticket.assignedEmployeeId == null
                                  ? undefined
                                  : employeeById.get(
                                      ticket.assignedEmployeeId
                                    );

                              return (
                                <TableRow
                                  key={ticket.id}
                                  hover
                                  className="knowledge-table-row"
                                  onClick={() =>
                                    navigate(`/tickets/${ticket.id}`)
                                  }
                                >
                                  <TableCell className="knowledge-ticket-cell">
                                    <Typography
                                      variant="body2"
                                      sx={{ fontWeight: 600 }}
                                    >
                                      #{ticket.id} · {ticket.title}
                                    </Typography>
                                  </TableCell>

                                  <TableCell>
                                    {employee?.name ?? 'Not assigned'}
                                  </TableCell>

                                  <TableCell className="knowledge-resolution-cell">
                                    {ticket.resolution || '—'}
                                  </TableCell>

                                  <TableCell className="knowledge-date-cell">
                                    {formatDate(ticket.resolvedAt)}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Collapse>
                  </Box>
                );
              })
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

export default KnowledgeBase;