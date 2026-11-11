using TicketCompass.Api.Interfaces;
using TicketCompass.Api.Models;
using TicketCompass.Api.Models.Enums;

namespace TicketCompass.Api.Services;

public class RecommendationService : IRecommendationService
{
    private readonly ITicketService _ticketService;
    private readonly IEmployeeService _employeeService;
    private readonly IAiAnalysisService _analysisService;

    private const double SkillWeight = 0.50;
    private const double ExperienceWeight = 0.30;
    private const double CapacityWeight = 0.20;

    public RecommendationService(
        ITicketService ticketService,
        IEmployeeService employeeService,
        IAiAnalysisService analysisService)
    {
        _ticketService = ticketService;
        _employeeService = employeeService;
        _analysisService = analysisService;
    }

    public async Task<List<Recommendation>> GetRecommendationsAsync(int ticketId)
    {
        var ticket = await _ticketService.GetByIdAsync(ticketId);

        if (ticket == null)
            throw new KeyNotFoundException("Ticket not found.");

        var analysis = await _analysisService.GetByTicketIdAsync(ticketId);

        if (analysis == null)
            throw new InvalidOperationException("Analyze the ticket before requesting recommendations.");

        var employees = await _employeeService.GetAllAsync();
        var tickets = await _ticketService.GetAllAsync();
        var recommendations = new List<Recommendation>();

        foreach (var employee in employees)
        {
            var activeTickets = tickets.Count(t =>
                t.AssignedEmployeeId == employee.Id &&
                t.Status != TicketStatus.Resolved);

            if (employee.MaxCapacity <= 0 || activeTickets >= employee.MaxCapacity)
                continue;

            var skillScore = CalculateSkillMatch(
                analysis.RequiredSkills, employee.Skills);

            var resolvedTickets = tickets.Where(t =>
                t.AssignedEmployeeId == employee.Id &&
                t.Status == TicketStatus.Resolved).ToList();

            var experienceScore = CalculateExperience(
                analysis.RequiredSkills, resolvedTickets);

            var capacityScore = (double)(employee.MaxCapacity - activeTickets)
                / employee.MaxCapacity;

            var score = (SkillWeight * skillScore)
                      + (ExperienceWeight * experienceScore)
                      + (CapacityWeight * capacityScore);

            recommendations.Add(new Recommendation
            {
                TicketId = ticketId,
                EmployeeId = employee.Id,
                Score = Math.Round(score * 100, 1),
                Reasons =
                [
                    $"Skill match: {skillScore:P0}",
                    $"Relevant experience: {experienceScore:P0}",
                    $"Available capacity: {employee.MaxCapacity - activeTickets}/{employee.MaxCapacity}"
                ]
            });
        }

        return recommendations
            .OrderByDescending(r => r.Score)
            .Take(3)
            .ToList();
    }

    private static double CalculateSkillMatch(
        List<string> requiredSkills,
        List<string> employeeSkills)
    {
        if (requiredSkills.Count == 0)
            return 0;

        var matches = requiredSkills.Count(required =>
            employeeSkills.Any(skill => SkillsMatch(required, skill)));

        return (double)matches / requiredSkills.Count;
    }

    private static double CalculateExperience(
        List<string> requiredSkills,
        List<Ticket> resolvedTickets)
    {
        if (resolvedTickets.Count == 0)
            return 0;

        var relevantTickets = resolvedTickets.Count(ticket =>
            ticket.RequiredSkills != null &&
            ticket.RequiredSkills.Any(required =>
                requiredSkills.Any(skill => SkillsMatch(skill, required))));

        return Math.Min(1.0, relevantTickets / 3.0);
    }

    private static bool SkillsMatch(string first, string second)
    {
        if (string.IsNullOrWhiteSpace(first) ||
            string.IsNullOrWhiteSpace(second))
            return false;

        return first.Equals(second, StringComparison.OrdinalIgnoreCase)
            || first.Contains(second, StringComparison.OrdinalIgnoreCase)
            || second.Contains(first, StringComparison.OrdinalIgnoreCase);
    }
}