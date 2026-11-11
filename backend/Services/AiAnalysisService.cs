using System.Text.Json;
using TicketCompass.Api.Interfaces;
using TicketCompass.Api.Models;

namespace TicketCompass.Api.Services;

public class AiAnalysisService : IAiAnalysisService
{
    private readonly string _filePath;
    private readonly string _promptPath;
    private readonly ITicketService _ticketService;
    private readonly ILlmService _llmService;

    private readonly JsonSerializerOptions _jsonOptions = new()
    {
        WriteIndented = true,
        PropertyNameCaseInsensitive = true
    };

    public AiAnalysisService(
        IWebHostEnvironment environment,
        ITicketService ticketService,
        ILlmService llmService)
    {
        _ticketService = ticketService;
        _llmService = llmService;

        _filePath = Path.Combine(
            environment.ContentRootPath,
            "Data",
            "ticket-analysis.json"
        );

        _promptPath = Path.Combine(
            environment.ContentRootPath,
            "Prompts",
            "TicketAnalysis.txt"
        );
    }

    private async Task<List<TicketAnalysis>> ReadAnalysesAsync()
    {
        if (!File.Exists(_filePath))
            return new List<TicketAnalysis>();

        var json = await File.ReadAllTextAsync(_filePath);

        return JsonSerializer.Deserialize<List<TicketAnalysis>>(
            json, _jsonOptions
        ) ?? new List<TicketAnalysis>();
    }

    private async Task SaveAnalysesAsync(List<TicketAnalysis> analyses)
    {
        var json = JsonSerializer.Serialize(analyses, _jsonOptions);
        await File.WriteAllTextAsync(_filePath, json);
    }

    public async Task<TicketAnalysis?> GetByTicketIdAsync(int ticketId)
    {
        var analyses = await ReadAnalysesAsync();

        return analyses.FirstOrDefault(a => a.TicketId == ticketId);
    }

    public async Task<TicketAnalysis> AnalyzeAsync(int ticketId)
    {
        // Retrieve the ticket
        var ticket = await _ticketService.GetByIdAsync(ticketId);

        if (ticket == null)
            throw new KeyNotFoundException($"Ticket {ticketId} not found.");

        // Load the prompt template
        var promptTemplate = await File.ReadAllTextAsync(_promptPath);

        // Insert ticket information into the prompt
        var prompt = promptTemplate
            .Replace("{{TITLE}}", ticket.Title)
            .Replace("{{DESCRIPTION}}", ticket.Description);

        // Request AI analysis
        var response = await _llmService.GenerateAsync(prompt);

        // Remove optional formatting like code blocks
        var cleanedResponse = response.Trim();

        if (cleanedResponse.StartsWith("```"))
        {
            cleanedResponse = cleanedResponse
                .Replace("```json", "")
                .Replace("```", "")
                .Trim();
        }

        // Parse the AI response
        using var document = JsonDocument.Parse(cleanedResponse);

        var root = document.RootElement;

        var category = root.GetProperty("category").GetString();
        var summary = root.GetProperty("summary").GetString();

        var requiredSkills = root.GetProperty("requiredSkills")
            .EnumerateArray()
            .Select(skill => skill.GetString() ?? string.Empty)
            .Where(skill => !string.IsNullOrWhiteSpace(skill))
            .ToList();

        if (string.IsNullOrWhiteSpace(category) ||
            string.IsNullOrWhiteSpace(summary))
        {
            throw new InvalidOperationException(
                "AI returned an incomplete ticket analysis."
            );
        }

        // Create analysis
        var analysis = new TicketAnalysis
        {
            TicketId = ticketId,
            Category = category,
            RequiredSkills = requiredSkills,
            Summary = summary
        };

        // Save or replace existing analysis
        var analyses = await ReadAnalysesAsync();

        analyses.RemoveAll(a => a.TicketId == ticketId);
        analyses.Add(analysis);

        await SaveAnalysesAsync(analyses);

        return analysis;
    }


    public async Task DeleteAsync(int ticketId)
    {
        var analyses = await ReadAnalysesAsync();

        var removedCount = analyses.RemoveAll(a => a.TicketId == ticketId);

        if (removedCount > 0)
        {
            await SaveAnalysesAsync(analyses);
        }
    }

}