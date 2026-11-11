using System.Text.Json;
using TicketCompass.Api.Interfaces;
using TicketCompass.Api.Models;

namespace TicketCompass.Api.Services;

public class EmployeeService : IEmployeeService
{
    private readonly string _filePath;

    public EmployeeService(IWebHostEnvironment environment)
    {
        _filePath = Path.Combine(environment.ContentRootPath, "Data", "employees.json");
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true
    };

    private async Task<List<Employee>> ReadEmployeesAsync()
    {
        if (!File.Exists(_filePath))
        {
            return [];
        }

        var json = await File.ReadAllTextAsync(_filePath);
        return JsonSerializer.Deserialize<List<Employee>>(json, JsonOptions) ?? [];
    }

    private async Task SaveEmployeesAsync(List<Employee> employees)
    {
        var json = JsonSerializer.Serialize(employees, JsonOptions);
        await File.WriteAllTextAsync(_filePath, json);
    }

    public async Task<List<Employee>> GetAllAsync()
    {
        return await ReadEmployeesAsync();
    }

    public async Task<Employee?> GetByIdAsync(int id)
    {
        var employees = await ReadEmployeesAsync();
        return employees.FirstOrDefault(_employee => _employee.Id == id);
    }

    public async Task<Employee> CreateAsync(Employee employee)
    {
        var employees = await ReadEmployeesAsync();

        employee.Id = employees.Count == 0 ? 1 : employees.Max(_employee => _employee.Id) + 1;

        employees.Add(employee);
        await SaveEmployeesAsync(employees);

        return employee;
    }

    public async Task<Employee?> UpdateAsync(int id, Employee employee)
    {
        var employees = await ReadEmployeesAsync();
        var existingEmployee = employees.FirstOrDefault(_employee => _employee.Id == id);

        if (existingEmployee == null)
        {
            return null;
        }

        employee.Id = id;

        var index = employees.IndexOf(existingEmployee);
        employees[index] = employee;

        await SaveEmployeesAsync(employees);
        return employee;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var employees = await ReadEmployeesAsync();
        var employee = employees.FirstOrDefault(_employee => _employee.Id == id);

        if (employee == null)
        {
            return false;
        }
        employees.Remove(employee);
        await SaveEmployeesAsync(employees);

        return true;
    }
}