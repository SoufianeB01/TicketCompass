namespace TicketCompass.Api.Models;

public class Employee
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<string> Skills { get; set; } = [];
    public int MaxCapacity { get; set; }
}