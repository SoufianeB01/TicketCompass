using TicketCompass.Api.Models;
using TicketCompass.Api.Models.Enums;

namespace TicketCompass.Api.Interfaces;

public interface ITicketService
{
    Task<List<Ticket>> GetAllAsync();
    Task<Ticket?> GetByIdAsync(int id);
    Task<List<Ticket>> GetByStatusAsync(TicketStatus status);
    Task<List<Ticket>> GetByEmployeeIdAsync(int employeeId);
    Task<Ticket> CreateAsync(Ticket ticket);
    Task<Ticket?> UpdateAsync(int id, Ticket ticket);
    Task<Ticket?> AssignAsync(int id, int employeeId, int maxCapacity);
    Task<Ticket?> ResolveAsync(int id, string resolution);
    Task<bool> DeleteAsync(int id);
}
