import { Card, CardHeader, CardDescription, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProductCardProps {
  name: string;
  price: number;
  originalPrice?: number;
  rating: number;
  business: string;
  location: string;
  discount?: number;
  imageUrl?: string;
  image?: string; // alias used by some pages
  onAdd?: () => void;
  adding?: boolean;
}

const ProductCard = ({
  name,
  price,
  originalPrice,
  rating,
  business,
  location,
  discount,
  imageUrl,
  image,
  onAdd,
  adding
}: ProductCardProps) => {
  const src = imageUrl || image || "/placeholder.svg";
  return (
    <Card className="overflow-hidden hover:shadow-elegant transition-all duration-300 group">
      <div className="relative">
        <div className="aspect-square bg-white relative overflow-hidden rounded-xl">
          <img
            src={src}
            alt={name}
            className="object-cover w-full h-full"
            onError={(e) => {
              if (e.currentTarget.src.endsWith("/placeholder.svg")) return;
              e.currentTarget.src = "/placeholder.svg";
            }}
            loading="lazy"
          />
        </div>
        {discount && (
          <Badge variant="destructive" className="absolute top-2 right-2">
            -{discount}%
          </Badge>
        )}
        <Badge className="absolute top-2 left-2 bg-primary/90 text-primary-foreground backdrop-blur-sm max-w-[70%] truncate">
          {business}
        </Badge>
      </div>
      <CardHeader className="pb-4">
        <div className="flex items-center text-xs text-muted-foreground mb-2 gap-1">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{location}</span>
        </div>
        <CardTitle className="text-lg">{name}</CardTitle>
        <CardDescription>by {business}</CardDescription>
        <div className="flex items-center mb-3">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span className="ml-1 text-sm font-medium">{rating}</span>
        </div>
        <div className="flex items-center">
          <span className="text-xl font-bold text-primary">
            ₱{price.toLocaleString()}
          </span>
          {originalPrice && (
            <span className="text-sm text-muted-foreground line-through ml-2">
              ₱{originalPrice.toLocaleString()}
            </span>
          )}
        </div>
        {onAdd && (
          <Button className="mt-4 w-full" variant="default" size="sm" disabled={adding} onClick={onAdd}>
            {adding ? 'Adding...' : 'Add to Cart'}
          </Button>
        )}
      </CardHeader>
    </Card>
  );
};

export default ProductCard;
