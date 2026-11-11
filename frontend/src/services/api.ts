import type {
  Ticket,
  Employee,
  TicketAnalysis,
  Recommendation,
  TicketStatus,
} from '../types/models';

const API_URL = '/api';

// Handle API requests and errors
async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }

  const text = await response.text();

  if (!text) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as T;
  }
}

// Tickets
export const getTickets = () =>
  request<Ticket[]>('/tickets');

export const getTicketById = (id: number) =>
  request<Ticket>(`/tickets/${id}`);

export const getTicketsByStatus = (status: TicketStatus) =>
  request<Ticket[]>(`/tickets/status/${status}`);

export const createTicket = (ticket: Omit<Ticket, 'id' | 'createdAt'>) =>
  request<Ticket>('/tickets', {
    method: 'POST',
    body: JSON.stringify(ticket),
  });

export const updateTicket = (id: number, ticket: Ticket) =>
  request<Ticket>(`/tickets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(ticket),
  });

export const deleteTicket = (id: number) =>
  request<string>(`/tickets/${id}`, {
    method: 'DELETE',
  });

// AI analysis
export const getTicketAnalysis = (id: number) =>
  request<TicketAnalysis>(`/tickets/${id}/analysis`);

export const analyzeTicket = (id: number) =>
  request<TicketAnalysis>(`/tickets/${id}/analyze`, {
    method: 'POST',
  });

// Recommendations
export const getRecommendations = (id: number) =>
  request<Recommendation[]>(`/tickets/${id}/recommendations`);

// Assignment and resolution
export const assignTicket = (ticketId: number, employeeId: number) =>
  request<Ticket>(
    `/tickets/${ticketId}/assign?employeeId=${employeeId}`,
    { method: 'POST' }
  );

export const resolveTicket = (ticketId: number, resolution: string) =>
  request<Ticket>(
    `/tickets/${ticketId}/resolve?resolution=${encodeURIComponent(resolution)}`,
    { method: 'POST' }
  );

// Employees
export const getEmployees = () =>
  request<Employee[]>('/employees');

export const getEmployeeById = (id: number) =>
  request<Employee>(`/employees/${id}`);

// Configuration
export const getActiveModel = () =>
  request<{ model: string }>('/config/model');