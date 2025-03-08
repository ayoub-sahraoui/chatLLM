import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { modelStore } from "../stores/model-store";
import { observer } from "mobx-react-lite";


const ModelsList = observer(function ModelsList() {

    const handleSelectModel = (name: string) => {
        modelStore.selectModelByName(name);
    };

    return (
        <Select onValueChange={handleSelectModel} value={modelStore.selectedModel?.name || ""}>
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
                <SelectGroup>
                    <SelectLabel>Available Models</SelectLabel>
                    {
                        modelStore.models.map((model) =>
                            <SelectItem key={model.id} value={model.name}>{model.name}</SelectItem>)
                    }
                </SelectGroup>
            </SelectContent>
        </Select>
    );
});

export default ModelsList