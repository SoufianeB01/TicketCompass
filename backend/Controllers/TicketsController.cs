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
    private readonly IEmployeeProfileService _employeeProfileService;
    private readonly IAiAnalysisService _aiAnalysisService;
    private readonly IRecommendationService _recommendationService;

    public TicketsController(
        ITicketService ticketService,
        IEmployeeService employeeService,
        IEmployeeProfileService employeeProfileService,
        IAiAnalysisService aiAnalysisService,
        IRecommendationService recommendationService)
    {
        _ticketService = ticketService;
        _employeeService = employeeService;
        _employeeProfileService = employeeProfileService;
        _aiAnalysisService = aiAnalysisService;
        _recommendationService = recommendationService;
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

    // GET: api/tickets/1/analysis
    [HttpGet("{id}/analysis")]
    public async Task<IActionResult> GetAnalysis(int id)
    {
        var ticket = await _ticketService.GetByIdAsync(id);

        if (ticket == null)
        {
            return NotFound($"Ticket with ID {id} was not found.");
        }

        var analysis = await _aiAnalysisService.GetByTicketIdAsync(id);

        if (analysis == null)
        {
            return NotFound($"No analysis found for ticket {id}.");
        }

        return Ok(analysis);
    }

    // POST: api/tickets/1/analyze
    [HttpPost("{id}/analyze")]
    public async Task<IActionResult> Analyze(int id)
    {
        var ticket = await _ticketService.GetByIdAsync(id);

        if (ticket == null)
        {
            return NotFound($"Ticket with ID {id} was not found.");
        }

        var analysis = await _aiAnalysisService.AnalyzeAsync(id);

        return Ok(analysis);
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
        var existingTicket = await _ticketService.GetByIdAsync(id);
        var updatedTicket = await _ticketService.UpdateAsync(id, ticket);

        if (updatedTicket == null)
        {
            return NotFound($"Ticket with ID {id} was not found.");
        }

        if (existingTicket != null)
        {
            // Invalidate AI analysis when ticket content changes
            if (existingTicket.Title != updatedTicket.Title ||
                existingTicket.Description != updatedTicket.Description)
            {
                await _aiAnalysisService.DeleteAsync(id);
            }

            if (existingTicket.Status == TicketStatus.Resolved &&
                existingTicket.AssignedEmployeeId.HasValue)
            {
                await _employeeProfileService.MarkOutdatedAsync(
                    existingTicket.AssignedEmployeeId.Value
                );
            }

            if (updatedTicket.Status == TicketStatus.Resolved &&
                updatedTicket.AssignedEmployeeId.HasValue &&
                (existingTicket.Status != TicketStatus.Resolved ||
                 existingTicket.AssignedEmployeeId != updatedTicket.AssignedEmployeeId))
            {
                await _employeeProfileService.MarkOutdatedAsync(
                    updatedTicket.AssignedEmployeeId.Value
                );
            }
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

        if (resolvedTicket.AssignedEmployeeId.HasValue)
        {
            await _employeeProfileService.MarkOutdatedAsync(
                resolvedTicket.AssignedEmployeeId.Value
            );
        }

        return Ok(resolvedTicket);
    }


    // DELETE: api/tickets/1
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var ticket = await _ticketService.GetByIdAsync(id);
        var deleted = await _ticketService.DeleteAsync(id);

        if (!deleted)
        {
            return NotFound($"Ticket with ID {id} was not found.");
        }

        // Remove stored AI analysis
        await _aiAnalysisService.DeleteAsync(id);

        if (ticket != null &&
            ticket.Status == TicketStatus.Resolved &&
            ticket.AssignedEmployeeId.HasValue)
        {
            await _employeeProfileService.MarkOutdatedAsync(
                ticket.AssignedEmployeeId.Value
            );
        }

        return Ok("Ticket deleted successfully.");
    }

    // GET: api/tickets/1/recommendations
    [HttpGet("{id}/recommendations")]
    public async Task<IActionResult> GetRecommendations(int id)
    {
        try
        {
            var recommendations = await _recommendationService.GetRecommendationsAsync(id);
            return Ok(recommendations);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

}