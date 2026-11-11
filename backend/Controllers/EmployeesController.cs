using Microsoft.AspNetCore.Mvc;
using TicketCompass.Api.Interfaces;
using TicketCompass.Api.Models;
using TicketCompass.Api.Models.Enums;

namespace TicketCompass.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EmployeesController : ControllerBase
{
    private readonly IEmployeeService _employeeService;
    private readonly ITicketService _ticketService;

    private readonly IEmployeeProfileService _employeeProfileService;

    public EmployeesController(
        IEmployeeService employeeService,
        ITicketService ticketService,
        IEmployeeProfileService employeeProfileService)
    {
        _employeeService = employeeService;
        _ticketService = ticketService;
        _employeeProfileService = employeeProfileService;
    }

    // GET: api/employees
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var employees = await _employeeService.GetAllAsync();
        return Ok(employees);
    }

    // GET: api/employees/1
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var employee = await _employeeService.GetByIdAsync(id);

        if (employee == null)
        {
            return NotFound($"Employee with ID {id} was not found.");
        }

        return Ok(employee);
    }

    // GET: api/employees/1/capacity
    [HttpGet("{id}/capacity")]
    public async Task<IActionResult> GetCapacity(int id)
    {
        var employee = await _employeeService.GetByIdAsync(id);

        if (employee == null)
        {
            return NotFound($"Employee with ID {id} was not found.");
        }

        // Count assigned tickets that are not resolved
        var tickets = await _ticketService.GetByEmployeeIdAsync(id);
        var activeTickets = tickets.Count(_ticket => _ticket.Status != TicketStatus.Resolved);
        var availableCapacity = Math.Max(0, employee.MaxCapacity - activeTickets);

        return Ok(new
        {
            EmployeeId = employee.Id,
            MaxCapacity = employee.MaxCapacity,
            ActiveTickets = activeTickets,
            AvailableCapacity = availableCapacity,
            IsAvailable = availableCapacity > 0
        });
    }

    // POST: api/employees
    [HttpPost]
    public async Task<IActionResult> Create(Employee employee)
    {
        var createdEmployee = await _employeeService.CreateAsync(employee);

        return CreatedAtAction(
            nameof(GetById),
            new { id = createdEmployee.Id },
            createdEmployee
        );
    }

    
    // PUT: api/employees/1
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, Employee employee)
    {
        var existingEmployee = await _employeeService.GetByIdAsync(id);
        var updatedEmployee = await _employeeService.UpdateAsync(id, employee);

        if (updatedEmployee == null)
        {
            return NotFound($"Employee with ID {id} not found.");
        }

        if (existingEmployee != null &&
            !existingEmployee.Skills.OrderBy(_skill => _skill)
                .SequenceEqual(updatedEmployee.Skills.OrderBy(_skill => _skill)))
        {
            await _employeeProfileService.MarkOutdatedAsync(id);
        }

        return Ok(updatedEmployee);
    }

    // DELETE: api/employees/1
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _employeeService.DeleteAsync(id);

        if (!deleted)
        {
            return NotFound($"Employee with ID {id} not found.");
        }

        await _employeeProfileService.DeleteAsync(id);

        return Ok("Employee deleted successfully.");
    }

}