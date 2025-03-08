import clsx from 'clsx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import React from 'react'

interface CapabilityToggleProps {
    icon: React.ReactNode;
    label: string;
    onToggle: (value: boolean) => void;
}

const CapabilityToggle = observer(function CapabilityToggle({ icon, label, onToggle }: CapabilityToggleProps) {
    const localState = useLocalObservable(() => ({
        enabled: false,
        toggle() {
            this.enabled = !this.enabled;
            if (onToggle) {
                onToggle(this.enabled);
            }
        }
    }));
    return (
        <div onClick={
            () => localState.toggle()
        } className={clsx(
            localState.enabled ? "bg-blue-500" : "bg-white",
            localState.enabled ? "text-white" : "text-gray-500",
            "cursor-pointer p-2 rounded-lg border flex justify-center items-center gap-2")}>
            {icon}
            <span className="font-light text-sm">{label}</span>
        </div>
    )
});

export default CapabilityToggle