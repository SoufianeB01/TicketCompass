using TicketCompass.Api.Models;

namespace TicketCompass.Api.Interfaces;

public interface IEmployeeProfileService
{
    Task<EmployeeProfile?> GetByEmployeeIdAsync(int employeeId);

    Task<EmployeeProfile?> GenerateAsync(int employeeId);
    Task MarkOutdatedAsync(int employeeId);
    Task DeleteAsync(int employeeId);
}