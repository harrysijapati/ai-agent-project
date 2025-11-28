"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [instruction, setInstruction] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generatedFiles, setGeneratedFiles] = useState([]);
  const [installing, setInstalling] = useState(false);
  const [running, setRunning] = useState(false);
  const [serverUrl, setServerUrl] = useState(null);
  const [activeTab, setActiveTab] = useState("agent");
  const [selectedFile, setSelectedFile] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [projectTree, setProjectTree] = useState([]);
  const [vercelToken, setVercelToken] = useState("");
  const [projectName, setProjectName] = useState("");
  const [deploying, setDeploying] = useState(false);
  const [deploymentUrl, setDeploymentUrl] = useState(null);
  const [showPlan, setShowPlan] = useState(false);
  const [plan, setPlan] = useState("");
  const [pendingInstruction, setPendingInstruction] = useState("");

  // NEW: Iteration mode states
  const [mode, setMode] = useState("new"); // "new" or "iterate"
  const [iterationCount, setIterationCount] = useState(0);
  const [projectContext, setProjectContext] = useState(null);
  const [showDiff, setShowDiff] = useState(false);
  const [diffData, setDiffData] = useState(null);

  const checkServerStatus = async () => {
    try {
      const response = await fetch("http://localhost:3001/api/status");
      const data = await response.json();
      setRunning(data.running);
      setServerUrl(data.url);
    } catch (error) {
      console.error("Error checking status:", error);
    }
  };

  const fetchProjectTree = async () => {
    try {
      const response = await fetch("http://localhost:3001/api/project-tree");
      const data = await response.json();
      setProjectTree(data.tree || []);
    } catch (error) {
      console.error("Error fetching tree:", error);
    }
  };

  useEffect(() => {
    checkServerStatus();
    const interval = setInterval(checkServerStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // Check if project exists to enable iterate mode
  useEffect(() => {
    if (generatedFiles.length > 0) {
      // Project exists, can use iterate mode
      setMode("iterate");
    }
  }, [generatedFiles]);

  const executeAgent = async () => {
    if (!instruction.trim()) return;

    setLoading(true);
    setHistory([]);

    try {
      const response = await fetch("http://localhost:3001/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction,
          mode,
          confirmed: false,
          iterationCount,
        }),
      });

      const data = await response.json();

      if (data.needsNewProject) {
        alert("No project found. Switching to 'New Project' mode.");
        setMode("new");
        setLoading(false);
        return;
      }

      if (data.suggestRegenerate) {
        if (
          confirm(
            "Maximum iterations reached. Would you like to regenerate the project from scratch?"
          )
        ) {
          setMode("new");
          setIterationCount(0);
          setInstruction("");
        }
        setLoading(false);
        return;
      }

      if (data.needsConfirmation) {
        setPlan(data.plan);
        setPendingInstruction(data.instruction);
        setProjectContext(data.context);
        setShowPlan(true);
        setLoading(false);
      } else if (data.success) {
        setHistory(data.history);
        const filesResponse = await fetch("http://localhost:3001/api/files");
        const filesData = await filesResponse.json();
        setGeneratedFiles(filesData.files);
        await fetchProjectTree();

        if (mode === "iterate") {
          setIterationCount((prev) => prev + 1);
        }

        setLoading(false);
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error executing agent: " + error.message);
      setLoading(false);
    }
  };

  const confirmAndGenerate = async () => {
    setShowPlan(false);
    setLoading(true);

    try {
      const response = await fetch("http://localhost:3001/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instruction: pendingInstruction,
          mode,
          confirmed: true,
          iterationCount,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setHistory(data.history);
        const filesResponse = await fetch("http://localhost:3001/api/files");
        const filesData = await filesResponse.json();
        setGeneratedFiles(filesData.files);
        await fetchProjectTree();

        if (mode === "iterate") {
          setIterationCount((prev) => prev + 1);
        }
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error executing agent: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelPlan = () => {
    setShowPlan(false);
    setPlan("");
    setPendingInstruction("");
  };

  const switchMode = (newMode) => {
    if (newMode === "new") {
      if (generatedFiles.length > 0) {
        if (
          !confirm("Switching to 'New Project' will start fresh. Continue?")
        ) {
          return;
        }
      }
      setIterationCount(0);
    }
    setMode(newMode);
  };

  const viewDiff = async (filePath, newContent) => {
    try {
      const response = await fetch("http://localhost:3001/api/diff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath, newContent }),
      });

      const diff = await response.json();
      setDiffData(diff);
      setShowDiff(true);
    } catch (error) {
      alert("Error loading diff: " + error.message);
    }
  };

  // ... (keep all existing functions: installDependencies, runProject, stopProject,
  // openFileForEdit, saveFile, deleteFile, deployToVercel, renderTree)

  const installDependencies = async () => {
    if (generatedFiles.length === 0) {
      alert("Please generate files first!");
      return;
    }
    setInstalling(true);
    try {
      const response = await fetch("http://localhost:3001/api/install", {
        method: "POST",
      });
      const data = await response.json();
      if (data.success) {
        alert("✅ Dependencies installed successfully!");
      } else {
        alert("❌ Error: " + data.error);
      }
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setInstalling(false);
    }
  };

  const runProject = async () => {
    try {
      const response = await fetch("http://localhost:3001/api/run", {
        method: "POST",
      });
      const data = await response.json();
      if (data.success) {
        setRunning(true);
        setServerUrl(data.url);
        alert("✅ Server started at " + data.url);
        window.open(data.url, "_blank");
      } else {
        alert("❌ Error: " + data.error);
      }
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const stopProject = async () => {
    try {
      const response = await fetch("http://localhost:3001/api/stop", {
        method: "POST",
      });
      if (response.ok) {
        setRunning(false);
        setServerUrl(null);
        alert("✅ Server stopped");
      }
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const openFileForEdit = async (filePath) => {
    try {
      const response = await fetch(
        `http://localhost:3001/api/file/${filePath}`
      );
      const data = await response.json();
      setSelectedFile(filePath);
      setEditContent(data.content);
      setActiveTab("editor");
    } catch (error) {
      alert("Error loading file: " + error.message);
    }
  };

  const saveFile = async () => {
    if (!selectedFile) return;
    setSaving(true);
    try {
      const response = await fetch(
        `http://localhost:3001/api/file/${selectedFile}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: editContent }),
        }
      );
      const data = await response.json();
      if (data.success) {
        alert("✅ File saved successfully!");
        const filesResponse = await fetch("http://localhost:3001/api/files");
        const filesData = await filesResponse.json();
        setGeneratedFiles(filesData.files);
      } else {
        alert("❌ Error: " + data.error);
      }
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteFile = async (filePath) => {
    if (!confirm("Are you sure you want to delete this file?")) return;
    try {
      const response = await fetch(
        `http://localhost:3001/api/file/${filePath}`,
        {
          method: "DELETE",
        }
      );
      const data = await response.json();
      if (data.success) {
        alert("✅ File deleted");
        const filesResponse = await fetch("http://localhost:3001/api/files");
        const filesData = await filesResponse.json();
        setGeneratedFiles(filesData.files);
        await fetchProjectTree();
        if (selectedFile === filePath) {
          setSelectedFile(null);
          setEditContent("");
        }
      }
    } catch (error) {
      alert("Error: " + error.message);
    }
  };

  const deployToVercel = async () => {
    if (!vercelToken) {
      alert("Please enter your Vercel token");
      return;
    }
    setDeploying(true);
    try {
      const response = await fetch("http://localhost:3001/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vercelToken, projectName }),
      });
      const data = await response.json();
      if (data.success) {
        setDeploymentUrl(data.url);
        alert("🎉 Deployed successfully!\n\n" + data.url);
      } else {
        alert("❌ Deployment failed: " + data.error);
      }
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setDeploying(false);
    }
  };

  const renderTree = (nodes, level = 0) => {
    return nodes.map((node, index) => (
      <div key={index} style={{ marginLeft: `${level * 20}px` }}>
        <div className="flex items-center py-1 hover:bg-slate-100 px-2 rounded cursor-pointer">
          {node.type === "directory" ? (
            <>
              <span className="mr-2">📁</span>
              <span className="text-sm font-medium">{node.name}</span>
            </>
          ) : (
            <>
              <span className="mr-2">📄</span>
              <span
                className="text-sm text-blue-600 hover:underline"
                onClick={() => openFileForEdit(node.path)}
              >
                {node.name}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteFile(node.path);
                }}
                className="ml-auto text-red-500 hover:text-red-700 text-xs"
              >
                ✕
              </button>
            </>
          )}
        </div>
        {node.children && renderTree(node.children, level + 1)}
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <h1 className="text-3xl font-bold text-slate-800">
            🤖 AI Agent Website Builder
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Generate • Edit • Preview • Deploy
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex space-x-1">
            {[
              { id: "agent", label: "🤖 Agent", icon: "" },
              {
                id: "files",
                label: "📁 Files",
                icon: "",
                disabled: generatedFiles.length === 0,
              },
              {
                id: "editor",
                label: "✏️ Editor",
                icon: "",
                disabled: !selectedFile,
              },
              {
                id: "preview",
                label: "👁️ Preview",
                icon: "",
                disabled: !running,
              },
              {
                id: "deploy",
                label: "🚀 Deploy",
                icon: "",
                disabled: generatedFiles.length === 0,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => !tab.disabled && setActiveTab(tab.id)}
                disabled={tab.disabled}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === tab.id
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-slate-600 hover:text-slate-800"
                } ${tab.disabled ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Plan Modal */}
        {showPlan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
                <h2 className="text-2xl font-bold">
                  {mode === "iterate"
                    ? "🔄 Review Iteration Plan"
                    : "📋 Review Your Website Plan"}
                </h2>
                <p className="text-sm mt-1 text-blue-100">
                  {mode === "iterate"
                    ? "Changes will be applied to your existing project"
                    : "Please review the plan and confirm to proceed"}
                </p>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                {mode === "iterate" && projectContext && (
                  <div className="mb-4 p-4 bg-slate-100 rounded-lg">
                    <h3 className="font-semibold text-slate-800 mb-2">
                      📊 Current Project:
                    </h3>
                    <ul className="text-sm text-slate-700 space-y-1">
                      <li>• {projectContext.pages.length} pages</li>
                      <li>• {projectContext.components.length} components</li>
                      <li>• Iteration: {iterationCount + 1}/5</li>
                    </ul>
                  </div>
                )}

                <div className="prose prose-slate max-w-none">
                  <pre className="whitespace-pre-wrap text-sm bg-slate-50 p-6 rounded-lg border border-slate-200">
                    {plan}
                  </pre>
                </div>
              </div>

              <div className="border-t border-slate-200 p-6 bg-slate-50 flex gap-4">
                <button
                  onClick={cancelPlan}
                  className="flex-1 bg-slate-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-slate-700 transition-colors"
                >
                  ✕ Cancel
                </button>
                <button
                  onClick={confirmAndGenerate}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-colors"
                >
                  {mode === "iterate"
                    ? "✓ Apply Changes"
                    : "✓ Confirm & Generate"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Diff Modal */}
        {showDiff && diffData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="bg-slate-800 text-white p-4">
                <h2 className="text-xl font-bold">
                  📊 File Changes: {diffData.filePath}
                </h2>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                {diffData.isNew ? (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                    <p className="text-green-800">
                      ✨ New file will be created
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold text-red-700 mb-2">
                        ❌ Before
                      </h3>
                      <pre className="text-xs bg-red-50 p-3 rounded border border-red-200 overflow-x-auto">
                        {diffData.oldLines.join("\n")}
                      </pre>
                    </div>
                    <div>
                      <h3 className="font-semibold text-green-700 mb-2">
                        ✅ After
                      </h3>
                      <pre className="text-xs bg-green-50 p-3 rounded border border-green-200 overflow-x-auto">
                        {diffData.newLines.join("\n")}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 p-4 bg-slate-50">
                <button
                  onClick={() => setShowDiff(false)}
                  className="w-full bg-slate-600 text-white py-2 px-4 rounded-lg hover:bg-slate-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Agent Tab */}
        {activeTab === "agent" && (
          <div className="space-y-6">
            {/* Mode Selector */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">
                🎯 Project Mode
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => switchMode("new")}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    mode === "new"
                      ? "border-blue-600 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="text-3xl mb-2">🆕</div>
                  <div className="font-semibold text-slate-800">
                    New Project
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    Start from scratch
                  </div>
                </button>

                <button
                  onClick={() => switchMode("iterate")}
                  disabled={generatedFiles.length === 0}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    mode === "iterate"
                      ? "border-purple-600 bg-purple-50"
                      : "border-slate-200 hover:border-slate-300"
                  } ${
                    generatedFiles.length === 0
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  <div className="text-3xl mb-2">🔄</div>
                  <div className="font-semibold text-slate-800">Iterate</div>
                  <div className="text-xs text-slate-600 mt-1">
                    {generatedFiles.length === 0
                      ? "Generate a project first"
                      : `Modify existing (${iterationCount}/5 iterations)`}
                  </div>
                </button>
              </div>
            </div>

            {/* Input Section */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {mode === "iterate"
                  ? "What would you like to add or change?"
                  : "Describe your website:"}
              </label>
              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder={
                  mode === "iterate"
                    ? "Example: Add a testimonials section to the home page"
                    : "Example: Create a landing page with hero section, features, and pricing"
                }
                className="w-full h-32 p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                disabled={loading}
              />
              <button
                onClick={executeAgent}
                disabled={loading || !instruction.trim()}
                className="mt-4 w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading
                  ? "Agent Working..."
                  : mode === "iterate"
                  ? "🔄 Generate Changes"
                  : "🚀 Generate Project"}
              </button>
            </div>

            {/* Rest of Agent Tab - keep existing code for Project Controls and Agent Process */}
            {generatedFiles.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-4">
                  🎮 Project Controls
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={installDependencies}
                    disabled={installing}
                    className="bg-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-purple-700 disabled:bg-slate-300 transition-colors"
                  >
                    {installing
                      ? "⏳ Installing..."
                      : "📦 Install Dependencies"}
                  </button>

                  <button
                    onClick={runProject}
                    disabled={running}
                    className="bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 disabled:bg-slate-400 transition-colors"
                  >
                    {running ? "✅ Running" : "▶️ Run Project"}
                  </button>

                  {running && (
                    <button
                      onClick={stopProject}
                      className="bg-red-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-red-700 transition-colors"
                    >
                      ⏹️ Stop Server
                    </button>
                  )}
                </div>

                {serverUrl && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>🚀 Running at:</strong>{" "}
                      <a
                        href={serverUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-green-900"
                      >
                        {serverUrl}
                      </a>
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-slate-800 mb-4">
                🔄 Agent Process
              </h2>

              {history.length === 0 && !loading && (
                <p className="text-slate-500 text-center py-12">
                  Enter an instruction to see the agent in action
                </p>
              )}

              <div className="space-y-3">
                {history.map((step, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border-2 ${
                      step.type === "reason"
                        ? "bg-blue-50 border-blue-200"
                        : step.type === "act"
                        ? "bg-purple-50 border-purple-200"
                        : step.type === "observe"
                        ? "bg-green-50 border-green-200"
                        : "bg-yellow-50 border-yellow-200"
                    }`}
                  >
                    <div className="text-xs font-semibold text-slate-600 mb-1">
                      {step.type.toUpperCase()}
                      {step.iteration && ` - Iteration ${step.iteration}`}
                    </div>
                    <div className="text-sm text-slate-700">
                      {step.type === "act" ? (
                        <div>
                          <strong>{step.tool}</strong>
                          <pre className="text-xs mt-1 bg-white p-2 rounded overflow-x-auto">
                            {JSON.stringify(step.params, null, 2)}
                          </pre>
                        </div>
                      ) : step.type === "observe" ? (
                        <span
                          className={
                            step.content.error
                              ? "text-red-600"
                              : "text-green-600"
                          }
                        >
                          {step.content.error || step.content.message}
                        </span>
                      ) : (
                        step.content
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* Files Tab */}
        {activeTab === "files" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* File Tree */}
            <div className="lg:col-span-1 bg-white rounded-lg shadow-lg p-4">
              <h3 className="font-bold text-slate-800 mb-3">
                📂 Project Structure
              </h3>
              <button
                onClick={fetchProjectTree}
                className="text-xs bg-slate-100 px-3 py-1 rounded mb-3 hover:bg-slate-200"
              >
                🔄 Refresh
              </button>
              <div className="text-sm">{renderTree(projectTree)}</div>
            </div>

            {/* File List */}
            <div className="lg:col-span-3 bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-bold text-slate-800 mb-4">
                📄 Generated Files ({generatedFiles.length})
              </h2>
              <div className="space-y-4">
                {generatedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="border border-slate-200 rounded-lg overflow-hidden"
                  >
                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                      <p className="font-mono text-sm text-slate-700 font-semibold">
                        {file.path}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openFileForEdit(file.path)}
                          className="text-blue-600 hover:text-blue-800 text-sm px-3 py-1 rounded bg-blue-50"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => deleteFile(file.path)}
                          className="text-red-600 hover:text-red-800 text-sm px-3 py-1 rounded bg-red-50"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                    <pre className="p-4 text-xs overflow-x-auto bg-slate-900 text-slate-100 max-h-64">
                      <code>{file.content}</code>
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* Editor Tab */}
        {activeTab === "editor" && selectedFile && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">
                  ✏️ Code Editor
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Editing: {selectedFile}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveFile}
                  disabled={saving}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-slate-300 transition-colors"
                >
                  {saving ? "💾 Saving..." : "💾 Save File"}
                </button>
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setEditContent("");
                    setActiveTab("files");
                  }}
                  className="bg-slate-600 text-white px-6 py-2 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  ✕ Close
                </button>
              </div>
            </div>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full h-[600px] p-4 border border-slate-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-slate-900 text-slate-100"
              spellCheck={false}
            />
          </div>
        )}

        {/* Preview Tab */}
        {activeTab === "preview" && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-slate-800">
                👁️ Live Preview
              </h2>
              <a
                href={serverUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                🔗 Open in New Tab
              </a>
            </div>
            {serverUrl ? (
              <iframe
                src={serverUrl}
                className="w-full h-[700px] border-2 border-slate-300 rounded-lg"
                title="Preview"
              />
            ) : (
              <p className="text-center text-slate-500 py-12">
                Please start the server to see preview
              </p>
            )}
          </div>
        )}

        {/* Deploy Tab */}
        {activeTab === "deploy" && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">
              🚀 Deploy to Vercel
            </h2>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>📝 Note:</strong> Get your Vercel token from{" "}
                <a
                  href="https://vercel.com/account/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-900"
                >
                  https://vercel.com/account/tokens
                </a>
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Vercel Token *
                </label>
                <input
                  type="password"
                  value={vercelToken}
                  onChange={(e) => setVercelToken(e.target.value)}
                  placeholder="Enter your Vercel token"
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Project Name (optional)
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="my-awesome-project"
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              onClick={deployToVercel}
              disabled={deploying || !vercelToken}
              className="w-full bg-black text-white py-4 px-6 rounded-lg font-medium hover:bg-slate-800 disabled:bg-slate-300 transition-colors"
            >
              {deploying ? "🚀 Deploying to Vercel..." : "🚀 Deploy to Vercel"}
            </button>

            {deploymentUrl && (
              <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-bold text-green-800 mb-2">
                  🎉 Deployment Successful!
                </h3>
                <p className="text-sm text-green-700 mb-3">
                  Your site is now live at:
                </p>
                <a
                  href={deploymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 hover:text-green-800 underline break-all"
                >
                  {deploymentUrl}
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
