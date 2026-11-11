using TicketCompass.Api.Models.Enums;

namespace TicketCompass.Api.Models;


public class Ticket
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<string>? RequiredSkills { get; set; }
    public TicketPriority Priority { get; set; } = TicketPriority.Medium;
    public TicketStatus Status { get; set; } = TicketStatus.Open;
    public DateTime CreatedAt { get; set; }
    public int? AssignedEmployeeId { get; set; }
    public string? Resolution { get; set; }
    public DateTime? ResolvedAt { get; set; }
}