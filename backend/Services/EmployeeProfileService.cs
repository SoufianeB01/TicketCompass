
using System.Text.Json;
using TicketCompass.Api.Interfaces;
using TicketCompass.Api.Models;

namespace TicketCompass.Api.Services;

public class EmployeeProfileService : IEmployeeProfileService
{
    private readonly string _filePath;
    private readonly IEmployeeService _employeeService;
    private readonly ITicketService _ticketService;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true
    };

    public EmployeeProfileService(
    IWebHostEnvironment environment,
    IEmployeeService employeeService,
    ITicketService ticketService)
    {
        _filePath = Path.Combine(environment.ContentRootPath, "Data", "employee-profiles.json");
        _employeeService = employeeService;
        _ticketService = ticketService;
    }

    private async Task<List<EmployeeProfile>> ReadProfilesAsync()
    {
        if (!File.Exists(_filePath))
        {
            return [];
        }

        var json = await File.ReadAllTextAsync(_filePath);
        return JsonSerializer.Deserialize<List<EmployeeProfile>>(json, JsonOptions) ?? [];
    }

    private async Task SaveProfilesAsync(List<EmployeeProfile> profiles)
    {
        var json = JsonSerializer.Serialize(profiles, JsonOptions);
        await File.WriteAllTextAsync(_filePath, json);
    }

    public async Task<EmployeeProfile?> GetByEmployeeIdAsync(int employeeId)
    {
        var profiles = await ReadProfilesAsync();
        return profiles.FirstOrDefault(_profile => _profile.EmployeeId == employeeId);
    }

    public Task<EmployeeProfile?> GenerateAsync(int employeeId)
    {
        throw new NotImplementedException();
    }

    public async Task MarkOutdatedAsync(int employeeId)
    {
        var profiles = await ReadProfilesAsync();
        var profile = profiles.FirstOrDefault(_profile => _profile.EmployeeId == employeeId);

        if (profile == null)
        {
            return;
        }
        profile.IsOutdated = true;
        await SaveProfilesAsync(profiles);
    }

    public async Task DeleteAsync(int employeeId)
    {
        var profiles = await ReadProfilesAsync();
        profiles.RemoveAll(_profile => _profile.EmployeeId == employeeId);

        await SaveProfilesAsync(profiles);
    }
}