using UnityEngine;

/// <summary>
/// Attach this script to the 'Table_Set_Switcher' GameObject in Unity.
/// Allows 1-click Inspector toggling or pressing 'H' at runtime to swap between Normal and Horror versions.
/// </summary>
public class TableSceneSwitcher : MonoBehaviour
{
    [Header("Set References")]
    [SerializeField] private GameObject normalSet;
    [SerializeField] private GameObject horrorSet;

    [Header("State")]
    [SerializeField] private bool showHorrorVersion = false;

    private void Reset()
    {
        // Auto-find child prefabs
        Transform norm = transform.Find("Table_Set_Normal_Prefab");
        if (norm != null) normalSet = norm.gameObject;

        Transform horr = transform.Find("Table_Set_Horror_Prefab");
        if (horr != null) horrorSet = horr.gameObject;

        UpdateVisibility();
    }

    private void OnValidate()
    {
        UpdateVisibility();
    }

    private void Start()
    {
        UpdateVisibility();
    }

    private void Update()
    {
        // Press 'H' to toggle between Normal and Horror versions in Play Mode
        if (Input.GetKeyDown(KeyCode.H))
        {
            ToggleVersion();
        }
    }

    public void ToggleVersion()
    {
        showHorrorVersion = !showHorrorVersion;
        UpdateVisibility();
    }

    public void SetHorrorActive(bool active)
    {
        showHorrorVersion = active;
        UpdateVisibility();
    }

    private void UpdateVisibility()
    {
        if (normalSet != null)
        {
            normalSet.SetActive(!showHorrorVersion);
        }

        if (horrorSet != null)
        {
            horrorSet.SetActive(showHorrorVersion);
        }
    }
}
