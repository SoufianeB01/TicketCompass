namespace TicketCompass.Api.Models;

public class Recommendation
{
    public int TicketId { get; set; }
    public int EmployeeId { get; set; }

    public double Score { get; set; }
    public double SkillScore { get; set; }
    public double ExperienceScore { get; set; }

    public int AvailableCapacity { get; set; }
    public int MaxCapacity { get; set; }

    public string Explanation { get; set; } = string.Empty;
}