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
  image
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
      </div>
      <CardHeader className="pb-4">
        <div className="flex items-center text-sm text-muted-foreground mb-2">
          <MapPin className="h-3 w-3 mr-1" />
          {location}
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
        <Button className="mt-4 w-full" variant="default" size="sm">
          Add to Cart
        </Button>
      </CardHeader>
    </Card>
  );
};

export default ProductCard;
