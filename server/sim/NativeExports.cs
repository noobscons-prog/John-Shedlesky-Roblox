using System;
using System.Runtime.InteropServices;
using System.Text;

namespace SimHost.Native;

public static class NativeExports
{
    private static IntPtr _lastJsonPtr = IntPtr.Zero;
    private static readonly object _lock = new();

    [UnmanagedCallersOnly(EntryPoint = "sfoth_init")]
    public static int Init()
    {
        try
        {
            // Replace this line if your Program.cs has an init entry point
            // (e.g. Program.Initialize();). If the sim is stateless until
            // the first Step, this can stay as-is.
            return 0;
        }
        catch
        {
            return 1;
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "sfoth_step_sim")]
    public static int StepSim()
    {
        try
        {
            // Call your existing simulation tick here. For example:
            //   Program.Tick();
            // If your Program.cs has a different method name, change it here.
            return 0;
        }
        catch
        {
            return 1;
        }
    }

    [UnmanagedCallersOnly(EntryPoint = "sfoth_get_snapshot_json")]
    public static IntPtr GetSnapshotJson()
    {
        lock (_lock)
        {
            // Replace this with the call that returns your current snapshot.
            // Example:
            //   string json = Program.GetSnapshotJson();
            string json = "{}";

            if (_lastJsonPtr != IntPtr.Zero)
            {
                Marshal.FreeHGlobal(_lastJsonPtr);
                _lastJsonPtr = IntPtr.Zero;
            }

            var bytes = Encoding.UTF8.GetBytes(json + "\0");
            _lastJsonPtr = Marshal.AllocHGlobal(bytes.Length);
            Marshal.Copy(bytes, 0, _lastJsonPtr, bytes.Length);
            return _lastJsonPtr;
        }
    }
}
