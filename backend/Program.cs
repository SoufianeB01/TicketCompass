using TicketCompass.Api.Interfaces;
using TicketCompass.Api.Services;

var builder = WebApplication.CreateBuilder(args);

//Register services
builder.Services.AddControllers();
builder.Services.AddSwaggerGen();

builder.Services.AddScoped<ITicketService, TicketService>();
builder.Services.AddScoped<IEmployeeService, EmployeeService>();
builder.Services.AddScoped<IRecommendationService, RecommendationService>();
builder.Services.AddScoped<IAiAnalysisService, AiAnalysisService>();
builder.Services.AddScoped<IEmployeeProfileService, EmployeeProfileService>();
builder.Services.AddHttpClient<ILlmService, LlmService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.MapControllers();

app.Run();
