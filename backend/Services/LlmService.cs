using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using TicketCompass.Api.Interfaces;

namespace TicketCompass.Api.Services;

public class LlmService : ILlmService
{
    private readonly HttpClient _httpClient;
    private readonly string _provider;

    public LlmService(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;

        _provider = configuration["LLM_PROVIDER"]
            ?? throw new InvalidOperationException("LLM_PROVIDER is not configured.");

        var baseUrl = configuration["LITELLM_BASE_URL"]
            ?? throw new InvalidOperationException("LITELLM_BASE_URL is not configured.");

        var masterKey = configuration["LITELLM_MASTER_KEY"]
            ?? throw new InvalidOperationException("LITELLM_MASTER_KEY is not configured.");

        _httpClient.BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/");

        _httpClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", masterKey);
    }

    public async Task<string> GenerateAsync(string prompt)
    {
        var request = new
        {
            model = _provider,
            messages = new[]
            {
                new
                {
                    role = "user",
                    content = prompt
                }
            }
        };

        using var response = await _httpClient.PostAsJsonAsync(
            "v1/chat/completions",
            request
        );

        response.EnsureSuccessStatusCode();

        using var json = await JsonDocument.ParseAsync(
            await response.Content.ReadAsStreamAsync()
        );

        return json.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString()
            ?? throw new InvalidOperationException("LLM returned an empty response.");
    }
}