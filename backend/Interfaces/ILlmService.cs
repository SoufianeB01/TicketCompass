namespace TicketCompass.Api.Interfaces;

public interface ILlmService
{
    Task<string> GenerateAsync(string prompt);
}
