using UnityEngine;

/// <summary>
/// Attach this script to the parent GameObject containing both
/// 'Coffee_Machine_Normal' and 'Coffee_Machine_Haunted' children.
/// Allows 1-click toggling in the Unity Inspector or runtime hotkey (e.g., 'C').
/// </summary>
[ExecuteInEditMode]
public class CoffeeMachineSceneSwitcher : MonoBehaviour
{
    [Header("Machine References")]
    [Tooltip("Reference to Coffee_Machine_Normal child object")]
    public GameObject normalCoffeeMachine;

    [Tooltip("Reference to Coffee_Machine_Haunted child object")]
    public GameObject hauntedCoffeeMachine;

    public enum MachineState
    {
        Normal,
        Haunted
    }

    [Header("State Control")]
    [SerializeField]
    private MachineState currentState = MachineState.Normal;

    public MachineState State
    {
        get => currentState;
        set
        {
            currentState = value;
            ApplyState();
        }
    }

    private void OnValidate()
    {
        ApplyState();
    }

    private void Start()
    {
        ApplyState();
    }

    private void Update()
    {
        // Press 'C' key at runtime to swap between Normal and Haunted
        if (Application.isPlaying && Input.GetKeyDown(KeyCode.C))
        {
            State = (currentState == MachineState.Normal) ? MachineState.Haunted : MachineState.Normal;
        }
    }

    public void ApplyState()
    {
        if (normalCoffeeMachine != null)
        {
            normalCoffeeMachine.SetActive(currentState == MachineState.Normal);
        }

        if (hauntedCoffeeMachine != null)
        {
            hauntedCoffeeMachine.SetActive(currentState == MachineState.Haunted);
        }
    }

    [ContextMenu("Switch to Normal Machine")]
    public void SetNormal() => State = MachineState.Normal;

    [ContextMenu("Switch to Haunted Machine")]
    public void SetHaunted() => State = MachineState.Haunted;
}
