using TicketCompass.Api.Models;

namespace TicketCompass.Api.Interfaces;

public interface IAiAnalysisService
{
    Task<TicketAnalysis?> GetByTicketIdAsync(int ticketId);

    Task<TicketAnalysis> AnalyzeAsync(int ticketId);

    Task DeleteAsync(int ticketId);
}