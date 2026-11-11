namespace TicketCompass.Api.Models;

public class Recommendation
{
    public int TicketId { get; set; }
    public int EmployeeId { get; set; }
    public double Score { get; set; }
    public List<string> Reasons { get; set; } = [];
}