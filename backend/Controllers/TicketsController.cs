using Microsoft.AspNetCore.Mvc;
using TicketCompass.Api.Interfaces;
using TicketCompass.Api.Models;
using TicketCompass.Api.Models.Enums;

namespace TicketCompass.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TicketsController : ControllerBase
{
    private readonly ITicketService _ticketService;
    private readonly IEmployeeService _employeeService;

    public TicketsController(ITicketService ticketService, IEmployeeService employeeService)
    {
        _ticketService = ticketService;
        _employeeService = employeeService;
    }

    // GET: api/tickets
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var tickets = await _ticketService.GetAllAsync();
        return Ok(tickets);
    }

    // GET: api/tickets/1
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var ticket = await _ticketService.GetByIdAsync(id);

        if (ticket == null)
        {
            return NotFound($"Ticket with ID {id} was not found.");
        }

        return Ok(ticket);
    }

    // GET: api/tickets/status/Resolved
    [HttpGet("status/{status}")]
    public async Task<IActionResult> GetByStatus(TicketStatus status)
    {
        var tickets = await _ticketService.GetByStatusAsync(status);
        return Ok(tickets);
    }

    // GET: api/tickets/employee/1
    [HttpGet("employee/{employeeId}")]
    public async Task<IActionResult> GetByEmployeeId(int employeeId)
    {
        var employee = await _employeeService.GetByIdAsync(employeeId);

        if (employee == null)
        {
            return NotFound($"Employee with ID {employeeId} was not found.");
        }

        var tickets = await _ticketService.GetByEmployeeIdAsync(employeeId);
        return Ok(tickets);
    }

    // POST: api/tickets
    [HttpPost]
    public async Task<IActionResult> Create(Ticket ticket)
    {
        var createdTicket = await _ticketService.CreateAsync(ticket);

        return CreatedAtAction(
            nameof(GetById),
            new { id = createdTicket.Id },
            createdTicket
        );
    }

    // PUT: api/tickets/1
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, Ticket ticket)
    {
        var updatedTicket = await _ticketService.UpdateAsync(id, ticket);

        if (updatedTicket == null)
        {
            return NotFound($"Ticket with ID {id} was not found.");
        }

        return Ok(updatedTicket);
    }

    // POST: api/tickets/1/assign?employeeId=2
    [HttpPost("{id}/assign")]
    public async Task<IActionResult> Assign(int id, [FromQuery] int employeeId)
    {
        var ticket = await _ticketService.GetByIdAsync(id);

        if (ticket == null)
        {
            return NotFound($"Ticket with ID {id} was not found.");
        }

        var employee = await _employeeService.GetByIdAsync(employeeId);

        if (employee == null)
        {
            return NotFound($"Employee with ID {employeeId} was not found.");
        }

        // Check capacity before assigning
        var updatedTicket = await _ticketService.AssignAsync(id, employeeId, employee.MaxCapacity);

        if (updatedTicket == null)
        {
            return BadRequest("Ticket cannot be assigned. Check the employee capacity and ticket status.");
        }

        return Ok(updatedTicket);
    }

    // POST: api/tickets/1/resolve?resolution=VPN%20reconfigured
    [HttpPost("{id}/resolve")]
    public async Task<IActionResult> Resolve(int id, [FromQuery] string resolution)
    {
        if (string.IsNullOrWhiteSpace(resolution))
        {
            return BadRequest("A resolution is required.");
        }

        var ticket = await _ticketService.GetByIdAsync(id);

        if (ticket == null)
        {
            return NotFound($"Ticket with ID {id} was not found.");
        }

        var resolvedTicket = await _ticketService.ResolveAsync(id, resolution);

        if (resolvedTicket == null)
        {
            return BadRequest("Ticket must be assigned and not already resolved.");
        }

        return Ok(resolvedTicket);
    }

    // DELETE: api/tickets/1
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _ticketService.DeleteAsync(id);

        if (!deleted)
        {
            return NotFound($"Ticket with ID {id} was not found.");
        }

        return Ok("Ticket deleted successfully.");
    }
}
