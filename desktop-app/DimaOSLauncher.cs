using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Windows.Forms;

[assembly: AssemblyTitle("DimaOS 11")]
[assembly: AssemblyDescription("DimaOS 11 Fun Edition desktop launcher")]
[assembly: AssemblyCompany("Dima Corporation")]
[assembly: AssemblyProduct("DimaOS 11")]
[assembly: AssemblyCopyright("© Dima Corporation 2026")]
[assembly: AssemblyVersion("1.0.0.0")]
[assembly: AssemblyFileVersion("1.0.0.0")]

internal static class DimaOSLauncher
{
    private const string AppUrl = "https://dimapuk39-star.github.io/DimaOS11/?source=windows-app";

    [STAThread]
    private static void Main()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        try
        {
            string edge = FindEdge();
            if (!string.IsNullOrEmpty(edge))
            {
                ProcessStartInfo info = new ProcessStartInfo
                {
                    FileName = edge,
                    Arguments = "--app=\"" + AppUrl + "\" --start-maximized",
                    UseShellExecute = false,
                    CreateNoWindow = true
                };
                Process.Start(info);
                return;
            }

            Process.Start(new ProcessStartInfo
            {
                FileName = AppUrl,
                UseShellExecute = true
            });
        }
        catch (Exception error)
        {
            MessageBox.Show(
                "Не удалось запустить DimaOS 11.\n\n" + error.Message,
                "DimaOS 11",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error
            );
        }
    }

    private static string FindEdge()
    {
        string[] candidates =
        {
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Microsoft", "Edge", "Application", "msedge.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Microsoft", "Edge", "Application", "msedge.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Microsoft", "Edge", "Application", "msedge.exe")
        };

        foreach (string candidate in candidates)
        {
            if (File.Exists(candidate)) return candidate;
        }

        return string.Empty;
    }
}
