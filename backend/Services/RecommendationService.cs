using System.Text.Json;
using TicketCompass.Api.Interfaces;
using TicketCompass.Api.Models;
using TicketCompass.Api.Models.Enums;

namespace TicketCompass.Api.Services;

public class RecommendationService : IRecommendationService
{
    private readonly ITicketService _ticketService;
    private readonly IEmployeeService _employeeService;
    private readonly IAiAnalysisService _analysisService;
    private readonly ILlmService _llmService;
    private readonly string _promptPath;
    private readonly string _recommendationsPath;

    private const double SkillWeight = 0.50;
    private const double ExperienceWeight = 0.30;
    private const double CapacityWeight = 0.20;

    public RecommendationService(
        ITicketService ticketService,
        IEmployeeService employeeService,
        IAiAnalysisService analysisService,
        ILlmService llmService,
        IWebHostEnvironment environment)
    {
        _ticketService = ticketService;
        _employeeService = employeeService;
        _analysisService = analysisService;
        _llmService = llmService;

        _promptPath = Path.Combine(
            environment.ContentRootPath,
            "Prompts",
            "Recommendation.txt"
        );
        _recommendationsPath = Path.Combine(
            environment.ContentRootPath,
            "Data",
            "recommendations.json"
        );
    }

    public async Task<List<Recommendation>> GetRecommendationsAsync(int ticketId)
    {
        var ticket = await _ticketService.GetByIdAsync(ticketId);

        if (ticket == null)
            throw new KeyNotFoundException("Ticket not found.");

        var analysis = await _analysisService.GetByTicketIdAsync(ticketId);

        if (analysis == null)
            throw new InvalidOperationException(
                "Analyze the ticket before requesting recommendations."
            );

        var employees = await _employeeService.GetAllAsync();
        var tickets = await _ticketService.GetAllAsync();

        // Prepare eligible employees and their historical tickets.
        var eligibleEmployees = new List<object>();

        foreach (var employee in employees)
        {
            var activeTickets = tickets.Count(t =>
                t.AssignedEmployeeId == employee.Id &&
                t.Status != TicketStatus.Resolved);

            if (employee.MaxCapacity <= 0 ||
                activeTickets >= employee.MaxCapacity)
                continue;

            var resolvedTickets = tickets
                .Where(t =>
                    t.AssignedEmployeeId == employee.Id &&
                    t.Status == TicketStatus.Resolved)
                .Select(t => new
                {
                    t.Title,
                    t.Description,
                    t.RequiredSkills,
                    t.Resolution
                })
                .ToList();

            eligibleEmployees.Add(new
            {
                employee.Id,
                employee.Name,
                employee.Skills,
                ResolvedTickets = resolvedTickets
            });
        }

        if (eligibleEmployees.Count == 0)
            return [];

        // Prepare the data for Gemini.
        var promptData = new
        {
            Ticket = new
            {
                ticket.Title,
                ticket.Description,
                analysis.Category,
                analysis.RequiredSkills,
                analysis.Summary
            },
            Employees = eligibleEmployees
        };

        var jsonData = JsonSerializer.Serialize(promptData);

        var promptTemplate = await File.ReadAllTextAsync(_promptPath);
        var prompt = promptTemplate.Replace("{{DATA}}", jsonData);

        // Ask Gemini to evaluate skills and experience.
        var response = await _llmService.GenerateAsync(prompt);

        var cleanedResponse = response.Trim();

        if (cleanedResponse.StartsWith("```"))
        {
            cleanedResponse = cleanedResponse
                .Replace("```json", "")
                .Replace("```", "")
                .Trim();
        }

        using var document = JsonDocument.Parse(cleanedResponse);

        var aiEmployees = document.RootElement
            .GetProperty("employees")
            .EnumerateArray();

        var recommendations = new List<Recommendation>();

        foreach (var aiEmployee in aiEmployees)
        {
            var employeeId = aiEmployee.GetProperty("employeeId").GetInt32();

            var employee = employees.FirstOrDefault(e => e.Id == employeeId);

            if (employee == null)
                continue;

            var activeTickets = tickets.Count(t =>
                t.AssignedEmployeeId == employee.Id &&
                t.Status != TicketStatus.Resolved);

            // Only include employees who have available capacity.
            if (employee.MaxCapacity <= 0 ||
                activeTickets >= employee.MaxCapacity)
                continue;

            var skillScore = Math.Clamp(
                aiEmployee.GetProperty("skillScore").GetDouble(), 0, 100
            ) / 100.0;

            var experienceScore = Math.Clamp(
                aiEmployee.GetProperty("experienceScore").GetDouble(), 0, 100
            ) / 100.0;

            var explanation = aiEmployee
                .GetProperty("explanation")
                .GetString() ?? string.Empty;

            var availableCapacity = employee.MaxCapacity - activeTickets;

            var capacityScore = (double)availableCapacity /
                employee.MaxCapacity;

            // Final score is calculated in C#, not by Gemini.
            var score =
                (SkillWeight * skillScore) +
                (ExperienceWeight * experienceScore) +
                (CapacityWeight * capacityScore);

            recommendations.Add(new Recommendation
            {
                TicketId = ticketId,
                EmployeeId = employee.Id,
                Score = Math.Round(score * 100, 1),
                SkillScore = Math.Round(skillScore * 100, 1),
                ExperienceScore = Math.Round(experienceScore * 100, 1),
                AvailableCapacity = availableCapacity,
                MaxCapacity = employee.MaxCapacity,
                Explanation = explanation
            });
        }

        var topRecommendations = recommendations
        .OrderByDescending(r => r.Score)
        .Take(3)
        .ToList();

        await SaveRecommendationsAsync(ticketId, topRecommendations);

        return topRecommendations;
    }

    private async Task SaveRecommendationsAsync(
    int ticketId,
    List<Recommendation> newRecommendations)
    {
        var allRecommendations = new List<Recommendation>();

        if (File.Exists(_recommendationsPath))
        {
            var json = await File.ReadAllTextAsync(_recommendationsPath);

            if (!string.IsNullOrWhiteSpace(json))
            {
                allRecommendations =
                    JsonSerializer.Deserialize<List<Recommendation>>(
                        json,
                        new JsonSerializerOptions
                        {
                            PropertyNameCaseInsensitive = true
                        }
                    ) ?? new List<Recommendation>();
            }
        }

        // Remove previous recommendations for this ticket.
        allRecommendations.RemoveAll(r => r.TicketId == ticketId);

        // Add the newly generated top 3.
        allRecommendations.AddRange(newRecommendations);

        var updatedJson = JsonSerializer.Serialize(
            allRecommendations,
            new JsonSerializerOptions
            {
                WriteIndented = true
            }
        );

        await File.WriteAllTextAsync(_recommendationsPath, updatedJson);
    }
}