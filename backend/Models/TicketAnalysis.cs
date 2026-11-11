namespace TicketCompass.Api.Models;

public class TicketAnalysis
{
    public int TicketId { get; set; }
    public string Category { get; set; } = string.Empty;
    public List<string> RequiredSkills { get; set; } = [];
    public string Summary { get; set; } = string.Empty;
}