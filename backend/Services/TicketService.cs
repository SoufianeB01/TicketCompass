using System.Text.Json;
using TicketCompass.Api.Interfaces;
using TicketCompass.Api.Models;
using TicketCompass.Api.Models.Enums;
using System.Text.Json.Serialization;

namespace TicketCompass.Api.Services;

public class TicketService : ITicketService
{
    private readonly string _filePath;

    public TicketService(IWebHostEnvironment environment)
    {
        _filePath = Path.Combine(environment.ContentRootPath, "Data", "tickets.json");
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        Converters = { new JsonStringEnumConverter() }
    };

    private async Task<List<Ticket>> ReadTicketsAsync()
    {
        if (!File.Exists(_filePath))
        {
            return [];
        }
        var json = await File.ReadAllTextAsync(_filePath);
        return JsonSerializer.Deserialize<List<Ticket>>(json, JsonOptions) ?? [];
    }

    private async Task SaveTicketsAsync(List<Ticket> tickets)
    {
        var json = JsonSerializer.Serialize(tickets, JsonOptions);
        await File.WriteAllTextAsync(_filePath, json);
    }

    public async Task<List<Ticket>> GetAllAsync()
    {
        return await ReadTicketsAsync();
    }

    public async Task<Ticket?> GetByIdAsync(int id)
    {
        var tickets = await ReadTicketsAsync();
        return tickets.FirstOrDefault(_ticket => _ticket.Id == id);
    }

    // Filter tickets by status
    public async Task<List<Ticket>> GetByStatusAsync(TicketStatus status)
    {
        var tickets = await ReadTicketsAsync();
        return tickets.Where(_ticket => _ticket.Status == status).ToList();
    }

    // Get tickets assigned to an employee
    public async Task<List<Ticket>> GetByEmployeeIdAsync(int employeeId)
    {
        var tickets = await ReadTicketsAsync();
        return tickets.Where(_ticket => _ticket.AssignedEmployeeId == employeeId).ToList();
    }

    public async Task<Ticket> CreateAsync(Ticket ticket)
    {
        var tickets = await ReadTicketsAsync();

        ticket.Id = tickets.Count == 0 ? 1 : tickets.Max(_ticket => _ticket.Id) + 1;
        ticket.CreatedAt = DateTime.UtcNow;

        tickets.Add(ticket);
        await SaveTicketsAsync(tickets);
        return ticket;
    }

    public async Task<Ticket?> UpdateAsync(int id, Ticket ticket)
    {
        var tickets = await ReadTicketsAsync();
        var existingTicket = tickets.FirstOrDefault(_ticket => _ticket.Id == id);

        if (existingTicket == null)
        {
            return null;
        }

        ticket.Id = id;
        ticket.CreatedAt = existingTicket.CreatedAt;

        var index = tickets.IndexOf(existingTicket);
        tickets[index] = ticket;
        await SaveTicketsAsync(tickets);
        return ticket;
    }

    // Assign a ticket to an available employee
    public async Task<Ticket?> AssignAsync(int id, int employeeId, int maxCapacity)
    {
        var tickets = await ReadTicketsAsync();
        var ticket = tickets.FirstOrDefault(_ticket => _ticket.Id == id);

        if (ticket == null || ticket.Status == TicketStatus.Resolved)
        {
            return null;
        }

        var activeTickets = tickets.Count(_ticket =>
            _ticket.AssignedEmployeeId == employeeId &&
            _ticket.Status != TicketStatus.Resolved);

        if (activeTickets >= maxCapacity && ticket.AssignedEmployeeId != employeeId)
        {
            return null;
        }

        ticket.AssignedEmployeeId = employeeId;
        ticket.Status = TicketStatus.InProgress;

        await SaveTicketsAsync(tickets);
        return ticket;
    }

    // Save the resolution for future historical matching
    public async Task<Ticket?> ResolveAsync(int id, string resolution)
    {
        var tickets = await ReadTicketsAsync();
        var ticket = tickets.FirstOrDefault(_ticket => _ticket.Id == id);

        if (ticket == null || ticket.Status == TicketStatus.Resolved || ticket.AssignedEmployeeId == null)
        {
            return null;
        }

        ticket.Status = TicketStatus.Resolved;
        ticket.Resolution = resolution;
        ticket.ResolvedAt = DateTime.UtcNow;

        await SaveTicketsAsync(tickets);
        return ticket;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var tickets = await ReadTicketsAsync();
        var ticket = tickets.FirstOrDefault(_ticket => _ticket.Id == id);

        if (ticket == null)
        {
            return false;
        }

        tickets.Remove(ticket);
        await SaveTicketsAsync(tickets);

        return true;
    }
}