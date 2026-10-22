using System;
using System.Runtime.InteropServices;
using System.Text;

namespace SfothNative;

public static class NativeExports
{
    private static IntPtr _lastJsonPtr = IntPtr.Zero;
    private static readonly object _lock = new();

    [UnmanagedCallersOnly(EntryPoint = "sfoth_init")]
    public static int Init()
    {
        try
        {
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
            // Replace this with your tick call.
            // Example: Program.Tick();
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
            // Replace this with your snapshot call.
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
