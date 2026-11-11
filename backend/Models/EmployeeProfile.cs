namespace TicketCompass.Api.Models;

public class EmployeeProfile
{
    public int EmployeeId { get; set; }
    public string Summary { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; }
    public bool IsOutdated { get; set; }
}