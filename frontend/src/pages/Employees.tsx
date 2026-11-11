import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Card, CardContent, Chip, CircularProgress,
  LinearProgress, TextField, Typography,
} from '@mui/material';
import { PeopleOutlined, SearchOutlined } from '@mui/icons-material';
import { getEmployees } from '../services/api';
import type { Employee, Ticket } from '../types/models';
import './Employees.css';

function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ticketsError, setTicketsError] = useState(false);

  useEffect(() => {
    let active = true;

    // Employee data is required. Tickets are optional, but provide live workload.
    Promise.all([
      getEmployees(),
      fetch('/api/tickets').then(async response => {
        if (!response.ok) throw new Error('Could not load tickets');
        return (await response.json()) as Ticket[];
      }).then(data => ({ data, failed: false }))
        .catch(() => ({ data: [] as Ticket[], failed: true })),
    ])
      .then(([employeeData, ticketResult]) => {
        if (!active) return;
        setEmployees(employeeData);
        setTickets(ticketResult.data);
        setTicketsError(ticketResult.failed);
      })
      .catch(() => {
        if (active) setError('Could not load employees. Please refresh the page.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    return employees.filter(employee =>
      employee.name.toLowerCase().includes(query) ||
      employee.skills.some(skill => skill.toLowerCase().includes(query))
    );
  }, [employees, search]);

  const activeTicketCount = (employeeId: number) => tickets.filter(ticket =>
    ticket.assignedEmployeeId === employeeId && ticket.status !== 'Resolved'
  ).length;

  if (loading) return <Box sx={{ p: 3 }}><CircularProgress /></Box>;

  return (
    <Box className="employees-page">
      <Box className="employees-header">
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Employees</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Team members, skills and current workload
          </Typography>
        </Box>
        <Chip icon={<PeopleOutlined />} label={`${employees.length} employees`} variant="outlined" />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {ticketsError && !error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Ticket data could not be loaded. Current workload is unavailable.
        </Alert>
      )}

      {!error && (
        <Card variant="outlined">
          <CardContent>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by name or skill..."
              value={search}
              onChange={event => setSearch(event.target.value)}
              slotProps={{ input: { startAdornment: <SearchOutlined sx={{ mr: 1, color: 'text.secondary' }} /> } }}
              sx={{ mb: 3 }}
            />

            {filteredEmployees.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                {employees.length === 0 ? 'No employees available.' : 'No employees match your search.'}
              </Typography>
            ) : (
              <Box className="employees-list">
                {filteredEmployees.map(employee => {
                  const assigned = activeTicketCount(employee.id);
                  const capacity = employee.maxCapacity;
                  const percentage = capacity > 0 ? Math.min(100, assigned / capacity * 100) : 0;

                  return (
                    <Box className="employee-row" key={employee.id}>
                      <Box className="employee-identity">
                        <Box className="employee-avatar">
                          {employee.name.trim().charAt(0).toUpperCase() || '?'}
                        </Box>
                        <Box>
                          <Typography sx={{ fontWeight: 600 }}>{employee.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Employee #{employee.id}
                          </Typography>
                        </Box>
                      </Box>

                      <Box className="employee-skills">
                        <Typography variant="caption" color="text.secondary">Skills</Typography>
                        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 0.75 }}>
                          {employee.skills.length > 0 ? employee.skills.map(skill => (
                            <Chip key={skill} label={skill} size="small" variant="outlined" />
                          )) : <Typography variant="body2" color="text.secondary">No skills listed</Typography>}
                        </Box>
                      </Box>

                      <Box className="employee-capacity">
                        <Typography variant="caption" color="text.secondary">Active tickets / Capacity</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.75, mb: 1 }}>
                        {ticketsError ? '—' : `${assigned} / ${capacity}`}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={ticketsError ? 0 : percentage}
                          sx={{ height: 7, borderRadius: 4, bgcolor: '#e5e7eb',
                            '& .MuiLinearProgress-bar': { bgcolor: percentage >= 100 ? '#dc2626' : '#4f46e5' } }}
                        />
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

export default Employees;
