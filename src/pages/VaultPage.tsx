export default function VaultPage() {
    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6">My Vault</h1>
            <div className="grid gap-4">
                {/* TODO: Add Vault Items */}
                <div className="p-4 border rounded-lg bg-card/50">
                    <p className="text-muted-foreground">No passwords stored yet.</p>
                </div>
            </div>
        </div>
    )
}
