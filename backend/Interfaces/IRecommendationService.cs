using TicketCompass.Api.Models;

namespace TicketCompass.Api.Interfaces;

public interface IRecommendationService
{
    Task<List<Recommendation>> GetRecommendationsAsync(int ticketId);
}